import {
  AdaptationRejection,
  RecordStatus,
  type Adaptation,
  type ProgramWeek,
} from '@stamina/contracts';
import {
  addDays,
  AdaptationChangeKind,
  AdaptationRule,
  AdaptationStatus,
  SessionFocus,
} from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { QUEUED_RESULT } from '../config.ts';
import { createAppSync } from '../create-app-sync.ts';
import { AppErrorCode } from '../enums/app-error-code.ts';
import { RequestOutcome } from '../enums/request-outcome.ts';
import {
  acceptAdaptation,
  createProgram,
  declineAdaptation,
  getAdaptations,
  getSessionDetail,
  isQueued,
} from '../index.ts';
import { createFakeApiClient } from '../services/create-fake-api-client.ts';
import { createFakeAuthService } from '../services/create-fake-auth-service.ts';
import { buildAdaptation } from '../testing/build-adaptation.ts';
import { readyToTrain } from '../testing/ready-to-train.ts';

/** A person with a fake week, two Sessions' worth of suggestions to seed, a switch for the network and a sync runner. */
async function setup() {
  const network = { online: true };
  const auth = createFakeAuthService();
  const server = createFakeApiClient(() => auth.getToken());
  const ready = await readyToTrain(undefined, [], {
    api: server,
    auth,
    network: { isOnline: () => network.online },
  });
  const created = await ready.mediator.send(createProgram());
  if (created.status !== RecordStatus.Saved) throw new Error('expected a saved program');
  const [first, second] = created.program.sessions;
  if (!first || !second) throw new Error('expected two Sessions');
  const sync = createAppSync({ services: ready.services, stores: ready.stores });
  const seed = async (overrides: Partial<Adaptation> = {}, session = first) => {
    const adaptation = buildAdaptation(session, overrides);
    await server.seedAdaptation(adaptation);
    return adaptation;
  };
  const currentWeek = async (): Promise<ProgramWeek> => (await server.getProgram())!;
  return {
    ...ready,
    network,
    sync,
    server,
    seed,
    program: created.program,
    first,
    second,
    currentWeek,
  };
}

const sessionRow = (week: ProgramWeek, index: number) => week.sessions[index]!;

describe('getAdaptations through the mediator', () => {
  it('lists the pending suggestions and caches the list', async () => {
    const { mediator, seed, services } = await setup();
    const adaptation = await seed();

    expect(await mediator.send(getAdaptations())).toEqual([adaptation]);
    expect(await services.planCache.readAdaptations()).toEqual([adaptation]);
  });

  it('has none when nothing is suggested', async () => {
    const { mediator } = await setup();

    expect(await mediator.send(getAdaptations())).toEqual([]);
  });

  it('reads the cached list without signal', async () => {
    const { mediator, seed, network } = await setup();
    const adaptation = await seed();
    await mediator.send(getAdaptations());
    network.online = false;

    expect(await mediator.send(getAdaptations())).toEqual([adaptation]);
  });

  it('rejects as offline when no list was ever fetched', async () => {
    const { mediator, network } = await setup();
    network.online = false;

    await expect(mediator.send(getAdaptations())).rejects.toMatchObject({
      code: AppErrorCode.Offline,
    });
  });

  it('leaves out a suggestion that expired', async () => {
    const { mediator, seed, first } = await setup();
    await seed({ validUntil: '2000-01-01' }, first);

    expect(await mediator.send(getAdaptations())).toEqual([]);
  });

  it('hides suggestions decided offline that still wait to sync, online or not', async () => {
    const { mediator, seed, network, second } = await setup();
    const accepted = await seed();
    const declined = await seed({}, second);
    await mediator.send(getAdaptations());
    network.online = false;
    await mediator.send(acceptAdaptation(accepted));
    await mediator.send(declineAdaptation(declined.id));

    expect(await mediator.send(getAdaptations())).toEqual([]);
    network.online = true;
    expect(await mediator.send(getAdaptations())).toEqual([]);
  });
});

describe('acceptAdaptation through the mediator', () => {
  it('applies the change, caches the returned program and drops the superseded Session detail', async () => {
    const { mediator, seed, services, first, server } = await setup();
    const adaptation = await seed();
    await mediator.send(getAdaptations());
    await mediator.send(getSessionDetail(first.id));
    expect(await services.planCache.readSessionDetail(first.id)).toBeDefined();

    const result = await mediator.send(acceptAdaptation(adaptation));

    if (isQueued(result) || result.status !== RecordStatus.Saved) {
      throw new Error('expected a saved accept');
    }
    expect(result.recorded).toBe(true);
    expect(result.adaptation).toMatchObject({
      id: adaptation.id,
      status: AdaptationStatus.Accepted,
    });
    const revised = result.program.sessions.find(({ date }) => date === first.date)!;
    expect(revised).toMatchObject({ revision: first.revision + 1 });
    expect(revised.id).not.toBe(first.id);
    expect(revised.exercises.some(({ sets }) => sets < 4)).toBe(true);
    expect(await services.planCache.readProgram()).toEqual(result.program);
    expect(await services.planCache.readSessionDetail(first.id)).toBeUndefined();
    expect(await services.planCache.readAdaptations()).toEqual([]);
    expect(await server.getProgram()).toEqual(result.program);
    expect((await server.getSession(first.id)).id).toBe(revised.id);
    expect(await mediator.send(getAdaptations())).toEqual([]);
    expect(await services.offlineQueue.pending()).toEqual([]);
  });

  it('moves a Session with a Move change', async () => {
    const { mediator, seed, first, server, program } = await setup();
    const taken = new Set(program.sessions.map(({ date }) => date));
    const to = [3, 4, 5, 6].map((n) => addDays(first.date, n)).find((date) => !taken.has(date))!;
    const adaptation = await seed({
      ruleId: AdaptationRule.UnplannedActivity,
      change: { kind: AdaptationChangeKind.MoveSession, sessionId: first.id, from: first.date, to },
    });

    await mediator.send(acceptAdaptation(adaptation));

    const moved = (await server.getProgram())!.sessions.find(({ date }) => date === to);
    expect(moved).toMatchObject({ revision: first.revision + 1 });
  });

  it('queues offline, hides the card, then applies it on sync', async () => {
    const { mediator, seed, network, sync, services, server, first, currentWeek } = await setup();
    const adaptation = await seed();
    await mediator.send(getAdaptations());
    network.online = false;

    const result = await mediator.send(acceptAdaptation(adaptation));

    expect(result).toBe(QUEUED_RESULT);
    expect(await services.planCache.readAdaptations()).toEqual([]);
    expect(await mediator.send(getAdaptations())).toEqual([]);
    expect(await services.offlineQueue.pending()).toHaveLength(1);
    expect(sessionRow(await currentWeek(), 0).revision).toBe(first.revision);

    network.online = true;
    expect(await sync()).toEqual({ replayed: 1, remaining: 0 });

    expect(sessionRow(await currentWeek(), 0).revision).toBe(first.revision + 1);
    expect(await services.planCache.readProgram()).toEqual(await server.getProgram());
    expect(await services.planCache.readSessionDetail(first.id)).toBeUndefined();
  });

  it('shows the latest program and drops the card when the Program moved on (stale)', async () => {
    const { mediator, seed, services, first, server } = await setup();
    const shown = await seed();
    const other = await seed({ ruleId: AdaptationRule.SoreArea }, first);
    await mediator.send(getAdaptations());
    await server.acceptAdaptation(other.id, { basis: other.basis });

    const result = await mediator.send(acceptAdaptation(shown));

    expect(result).toEqual({
      status: RecordStatus.Rejected,
      reason: AdaptationRejection.Stale,
      program: await server.getProgram(),
    });
    expect(await services.planCache.readProgram()).toEqual(await server.getProgram());
    expect(await mediator.send(getAdaptations())).toEqual([]);
    expect(await services.offlineQueue.pending()).toEqual([]);
    expect(
      (await server.getAdaptations()).adaptations.find(({ id }) => id === shown.id),
    ).toBeUndefined();
  });

  it('settles a queued accept that turns out stale as a result, not a retry', async () => {
    const { mediator, seed, network, sync, services, first, server } = await setup();
    const shown = await seed();
    const other = await seed({ ruleId: AdaptationRule.SoreArea }, first);
    await mediator.send(getAdaptations());
    network.online = false;
    await mediator.send(acceptAdaptation(shown));
    await server.acceptAdaptation(other.id, { basis: other.basis });

    network.online = true;
    expect(await sync()).toEqual({ replayed: 1, remaining: 0 });

    expect(await services.planCache.readProgram()).toEqual(await server.getProgram());
    expect((await services.planCache.readAdaptations())?.map(({ id }) => id)).not.toContain(
      shown.id,
    );
  });

  it('answers a repeat of an accepted suggestion with recorded false', async () => {
    const { mediator, seed, server } = await setup();
    const adaptation = await seed();
    await mediator.send(acceptAdaptation(adaptation));
    const afterFirst = await server.getProgram();

    const result = await mediator.send(acceptAdaptation(adaptation));

    expect(result).toMatchObject({ status: RecordStatus.Saved, recorded: false });
    expect(await server.getProgram()).toEqual(afterFirst);
  });

  it('is rejected as already decided after a decline and the program is still cached', async () => {
    const { mediator, seed, services, server } = await setup();
    const adaptation = await seed();
    await mediator.send(declineAdaptation(adaptation.id));

    const result = await mediator.send(acceptAdaptation(adaptation));

    expect(result).toEqual({
      status: RecordStatus.Rejected,
      reason: AdaptationRejection.AlreadyDecided,
      program: await server.getProgram(),
    });
    expect(await services.planCache.readProgram()).toEqual(await server.getProgram());
  });

  it('refuses an invalid suggestion before anything is written or queued', async () => {
    const { mediator, seed, services, network } = await setup();
    const adaptation = await seed();

    for (const online of [true, false]) {
      network.online = online;
      await expect(
        mediator.send(acceptAdaptation({ ...adaptation, id: 'not-a-uuid' })),
      ).rejects.toMatchObject({ code: AppErrorCode.ValidationFailed });
    }

    expect(await services.offlineQueue.pending()).toEqual([]);
  });
});

describe('declineAdaptation through the mediator', () => {
  it('records the decline, leaves the plan alone and drops the card', async () => {
    const { mediator, seed, server, services, program } = await setup();
    const adaptation = await seed();
    await mediator.send(getAdaptations());

    const result = await mediator.send(declineAdaptation(adaptation.id));

    expect(result).toMatchObject({
      status: RecordStatus.Saved,
      recorded: true,
      adaptation: { id: adaptation.id, status: AdaptationStatus.Declined },
    });
    expect(await server.getProgram()).toMatchObject({ sessions: program.sessions });
    expect(await services.planCache.readAdaptations()).toEqual([]);
    expect(await mediator.send(getAdaptations())).toEqual([]);
  });

  it('queues offline, hides the card, then records on sync', async () => {
    const { mediator, seed, network, sync, server, services } = await setup();
    const adaptation = await seed();
    await mediator.send(getAdaptations());
    network.online = false;

    expect(await mediator.send(declineAdaptation(adaptation.id))).toBe(QUEUED_RESULT);
    expect(await mediator.send(getAdaptations())).toEqual([]);
    expect(await services.offlineQueue.pending()).toHaveLength(1);

    network.online = true;
    expect(await sync()).toEqual({ replayed: 1, remaining: 0 });
    expect((await server.getAdaptations()).adaptations).toEqual([]);
    expect(await server.declineAdaptation(adaptation.id)).toMatchObject({ recorded: false });
  });

  it('answers a repeat with recorded false', async () => {
    const { mediator, seed } = await setup();
    const adaptation = await seed();
    await mediator.send(declineAdaptation(adaptation.id));

    expect(await mediator.send(declineAdaptation(adaptation.id))).toMatchObject({
      status: RecordStatus.Saved,
      recorded: false,
    });
  });

  it('is rejected as already decided after an accept', async () => {
    const { mediator, seed } = await setup();
    const adaptation = await seed();
    await mediator.send(acceptAdaptation(adaptation));

    expect(await mediator.send(declineAdaptation(adaptation.id))).toEqual({
      status: RecordStatus.Rejected,
      reason: AdaptationRejection.AlreadyDecided,
    });
  });
});

describe('the log-safe pipeline for Adaptations', () => {
  it('logs the request type, outcome and duration only', async () => {
    const { mediator, seed, network, sync, logLines, first } = await setup();
    const adaptation = await seed({ params: { sleep: 1, soreness: 2, energy: 2 } }, first);
    logLines.length = 0;

    await mediator.send(getAdaptations());
    network.online = false;
    await mediator.send(acceptAdaptation(adaptation));
    network.online = true;
    await sync();
    await mediator.send(declineAdaptation(adaptation.id));

    expect(logLines.map((line) => Object.keys(line).sort())).toEqual(
      logLines.map(() => ['durationMs', 'outcome', 'requestType']),
    );
    expect(logLines.map(({ outcome }) => outcome)).toEqual([
      RequestOutcome.Success,
      RequestOutcome.Queued,
      RequestOutcome.Success,
    ]);
    const text = JSON.stringify(logLines);
    expect(text).not.toContain(adaptation.id);
    expect(text).not.toContain(first.id);
    expect(text).not.toContain(SessionFocus.Lower);
  });
});
