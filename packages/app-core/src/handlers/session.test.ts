import {
  ApiError,
  logSetSchema,
  RecordStatus,
  type ApiClient,
  type LogSet,
} from '@stamina/contracts';
import { newId } from '@stamina/ids';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { QUEUED_RESULT, TEST_CLOCK } from '../config.ts';
import {
  AppErrorCode,
  finishSession,
  getProgram,
  getSessionDetail,
  logSet,
  RequestOutcome,
} from '../index.ts';
import { createDexieActivityLog } from '../services/create-dexie-activity-log.ts';
import { createDexieLocalData } from '../services/create-dexie-local-data.ts';
import { createDexieOfflineQueue } from '../services/create-dexie-offline-queue.ts';
import { createDexiePlanCache } from '../services/create-dexie-plan-cache.ts';
import { createDexieSessionLog } from '../services/create-dexie-session-log.ts';
import { createLocalDatabase } from '../services/create-local-database.ts';
import { reloadSession } from '../testing/reload-session.ts';
import { setupSession } from '../testing/setup-session.ts';
import type { Services } from '../types.ts';

const unreachable = () => new TypeError('Failed to fetch');

/** Records the set numbers the API receives, and fails the Nth call (1-based) when asked. */
function recordingApi(failOnCall?: number) {
  const received: number[] = [];
  let calls = 0;
  const wrapApi = (api: ApiClient): ApiClient => ({
    ...api,
    logSet: async (sessionId, set) => {
      calls += 1;
      if (calls === failOnCall) throw unreachable();
      received.push(set.setNumber);
      return api.logSet(sessionId, set);
    },
  });
  return { received, wrapApi };
}

/** Set numbers of the LogSet requests waiting in the queue, oldest first. */
async function queuedSetNumbers(services: Services): Promise<number[]> {
  const entries = await services.offlineQueue.pending();
  return entries.flatMap(({ request }) =>
    'set' in request ? [logSetSchema.parse(request.set).setNumber] : [],
  );
}

const loggedNumbers = (detail: { exercises: { loggedSets: LogSet[] }[] }) =>
  detail.exercises.flatMap((exercise) => exercise.loggedSets.map((set) => set.setNumber));

describe('logging a Session through the mediator', () => {
  it('writes the set locally and sends it while online', async () => {
    const { mediator, server, sessionId, setFor, exercise, services } = await setupSession();
    const set = setFor(1);

    const result = await mediator.send(logSet(sessionId, set));

    expect(result).toEqual({ status: RecordStatus.Saved, recorded: true });
    expect((await server.getSession(sessionId)).exercises.flatMap((e) => e.loggedSets)).toEqual([
      set,
    ]);
    expect((await services.sessionLog.read(sessionId)).sets).toEqual([set]);
    expect(
      (await mediator.send(getSessionDetail(sessionId))).exercises.find(
        ({ id }) => id === exercise.id,
      )?.loggedSets,
    ).toEqual([set]);
    expect(await services.offlineQueue.pending()).toEqual([]);
  });

  it('accepts a set done on the tagged easier variant', async () => {
    const { mediator, sessionId, setFor, exercise } = await setupSession();

    const result = await mediator.send(
      logSet(sessionId, setFor(1, { exerciseId: exercise.easier?.exerciseId ?? '' })),
    );

    expect(result).toEqual({ status: RecordStatus.Saved, recorded: true });
  });

  it('returns Rejected for an exercise outside the Session and drops the set locally', async () => {
    const { mediator, sessionId, setFor, services } = await setupSession();
    const result = await mediator.send(logSet(sessionId, setFor(1, { exerciseId: 'not-in-it' })));

    expect(result).toMatchObject({ status: RecordStatus.Rejected });
    expect((await services.sessionLog.read(sessionId)).sets).toEqual([]);
  });

  it('refuses an invalid set before anything is written or queued', async () => {
    const { mediator, sessionId, setFor, services, network } = await setupSession();

    for (const online of [true, false]) {
      network.online = online;
      await expect(mediator.send(logSet(sessionId, setFor(1, { rpe: 5 })))).rejects.toMatchObject({
        code: AppErrorCode.ValidationFailed,
      });
    }

    expect((await services.sessionLog.read(sessionId)).sets).toEqual([]);
    expect(await services.offlineQueue.pending()).toEqual([]);
  });

  describe('offline', () => {
    it('queues sets in order and still shows them in the Session', async () => {
      const { mediator, network, sessionId, setFor, services } = await setupSession();
      network.online = false;

      const results = [
        await mediator.send(logSet(sessionId, setFor(1))),
        await mediator.send(logSet(sessionId, setFor(2))),
      ];

      expect(results).toEqual([QUEUED_RESULT, QUEUED_RESULT]);
      expect(await queuedSetNumbers(services)).toEqual([1, 2]);
      expect(loggedNumbers(await mediator.send(getSessionDetail(sessionId)))).toEqual([1, 2]);
    });

    it('opens a Session cached while online, and rejects Offline for one never opened', async () => {
      const { mediator, network, sessionId, detail } = await setupSession();
      network.online = false;

      expect(await mediator.send(getSessionDetail(sessionId))).toEqual(detail);
      await expect(mediator.send(getSessionDetail(newId()))).rejects.toMatchObject({
        code: AppErrorCode.Offline,
      });
    });

    it('opens the cached week without signal', async () => {
      const { mediator, network } = await setupSession();
      const online = await mediator.send(getProgram());
      network.online = false;

      expect(await mediator.send(getProgram())).toEqual(online);
    });

    it('queues a set when the phone says online but the send cannot reach the server', async () => {
      const { wrapApi } = recordingApi(1);
      const { mediator, sessionId, setFor, services, sync, server } = await setupSession({
        wrapApi,
      });

      expect(await mediator.send(logSet(sessionId, setFor(1)))).toBe(QUEUED_RESULT);
      expect(loggedNumbers(await mediator.send(getSessionDetail(sessionId)))).toEqual([1]);
      expect(await services.offlineQueue.pending()).toHaveLength(1);

      expect(await sync()).toEqual({ replayed: 1, remaining: 0 });
      expect(loggedNumbers(await server.getSession(sessionId))).toEqual([1]);
    });

    it('lets a finish wait behind queued sets instead of overtaking them', async () => {
      const { mediator, network, sessionId, setFor, services, sync, server } = await setupSession();
      network.online = false;
      await mediator.send(logSet(sessionId, setFor(1)));
      network.online = true;

      const result = await mediator.send(finishSession(sessionId, { id: newId(), rpe: 8 }));

      expect(result).toBe(QUEUED_RESULT);
      expect(await services.offlineQueue.pending()).toHaveLength(2);
      expect(await sync()).toEqual({ replayed: 2, remaining: 0 });
      const stored = await server.getSession(sessionId);
      expect(loggedNumbers(stored)).toEqual([1]);
      expect(stored.finished).not.toBeNull();
    });
  });

  describe('an online send that fails', () => {
    /** The first LogSet call throws what `error` makes; later calls reach the fake server. */
    const failingFirstLogSet =
      (error: () => unknown) =>
      (api: ApiClient): ApiClient => {
        let calls = 0;
        return {
          ...api,
          logSet: async (sessionId, set) => {
            calls += 1;
            if (calls === 1) throw error();
            return api.logSet(sessionId, set);
          },
        };
      };

    it.each([
      ['a 500', () => new ApiError(500)],
      ['a 401', () => new ApiError(401)],
      ['a 429', () => new ApiError(429)],
      ['an unrecognised error', () => new Error('boom')],
    ])('queues the set on %s and a later sync delivers it', async (_name, error) => {
      const { mediator, sessionId, setFor, services, sync, server } = await setupSession({
        wrapApi: failingFirstLogSet(error),
      });

      expect(await mediator.send(logSet(sessionId, setFor(1)))).toBe(QUEUED_RESULT);

      expect(await queuedSetNumbers(services)).toEqual([1]);
      expect(loggedNumbers(await mediator.send(getSessionDetail(sessionId)))).toEqual([1]);
      expect(await sync()).toEqual({ replayed: 1, remaining: 0 });
      expect(loggedNumbers(await server.getSession(sessionId))).toEqual([1]);
    });

    it.each([400, 404, 422])(
      'does not queue the set on a permanent %i, and the caller gets the error',
      async (status) => {
        const { mediator, sessionId, setFor, services, sync } = await setupSession({
          wrapApi: failingFirstLogSet(() => new ApiError(status)),
        });

        await expect(mediator.send(logSet(sessionId, setFor(1)))).rejects.toMatchObject({
          code: AppErrorCode.Unknown,
        });

        expect(await services.offlineQueue.pending()).toEqual([]);
        expect(await sync()).toEqual({ replayed: 0, remaining: 0 });
      },
    );

    it.each([400, 404, 422])(
      'takes the set back off the device on a permanent %i, so the Session does not show it',
      async (status) => {
        const { mediator, sessionId, setFor, services } = await setupSession({
          wrapApi: failingFirstLogSet(() => new ApiError(status)),
        });

        await expect(mediator.send(logSet(sessionId, setFor(1)))).rejects.toBeDefined();

        expect((await services.sessionLog.read(sessionId)).sets).toEqual([]);
        expect(loggedNumbers(await mediator.send(getSessionDetail(sessionId)))).toEqual([]);
      },
    );

    const failingFinish =
      (error: () => unknown) =>
      (api: ApiClient): ApiClient => ({
        ...api,
        finishSession: async () => {
          throw error();
        },
      });

    it.each([400, 404, 422])(
      'takes the finish back on a permanent %i: the Session does not read as finished and nothing is queued',
      async (status) => {
        const { mediator, sessionId, services } = await setupSession({
          wrapApi: failingFinish(() => new ApiError(status)),
        });

        await expect(
          mediator.send(finishSession(sessionId, { id: newId(), rpe: 8 })),
        ).rejects.toMatchObject({ code: AppErrorCode.Unknown });

        expect((await services.sessionLog.read(sessionId)).finish).toBeNull();
        expect((await mediator.send(getSessionDetail(sessionId))).finished).toBeNull();
        expect(await services.offlineQueue.pending()).toEqual([]);
      },
    );

    it('keeps the first finish when a second one is refused for good', async () => {
      let calls = 0;
      const { mediator, sessionId, services } = await setupSession({
        wrapApi: (api) => ({
          ...api,
          finishSession: async (id, finish) => {
            calls += 1;
            if (calls > 1) throw new ApiError(422);
            return api.finishSession(id, finish);
          },
        }),
      });
      const first = { id: newId(), rpe: 8, minutes: 40 };
      await mediator.send(finishSession(sessionId, first));

      await expect(
        mediator.send(finishSession(sessionId, { id: newId(), rpe: 3 })),
      ).rejects.toBeDefined();

      expect((await services.sessionLog.read(sessionId)).finish?.finish.id).toBe(first.id);
    });
  });

  describe('sync', () => {
    it('replays queued sets in order, removes them, and the server then has them', async () => {
      const { received, wrapApi } = recordingApi();
      const { mediator, network, sessionId, setFor, services, sync, server } = await setupSession({
        wrapApi,
      });
      network.online = false;
      for (const number of [1, 2, 3]) await mediator.send(logSet(sessionId, setFor(number)));
      network.online = true;

      expect(await sync()).toEqual({ replayed: 3, remaining: 0 });

      expect(received).toEqual([1, 2, 3]);
      expect(await services.offlineQueue.pending()).toEqual([]);
      expect(loggedNumbers(await server.getSession(sessionId))).toEqual([1, 2, 3]);
      expect(loggedNumbers(await mediator.send(getSessionDetail(sessionId)))).toEqual([1, 2, 3]);
    });

    it('does nothing while offline and keeps every entry', async () => {
      const { received, wrapApi } = recordingApi();
      const { mediator, network, sessionId, setFor, services, sync } = await setupSession({
        wrapApi,
      });
      network.online = false;
      await mediator.send(logSet(sessionId, setFor(1)));

      expect(await sync()).toEqual({ replayed: 0, remaining: 1 });

      expect(received).toEqual([]);
      expect(await services.offlineQueue.pending()).toHaveLength(1);
    });

    it('ignores a replay of an id the server already has', async () => {
      const { mediator, network, sessionId, setFor, sync, server, services } = await setupSession();
      const set = setFor(1);
      network.online = false;
      await mediator.send(logSet(sessionId, set));
      // The server got it earlier (an earlier sync that died before the queue entry was removed).
      await server.logSet(sessionId, set);
      network.online = true;

      expect(await sync()).toEqual({ replayed: 1, remaining: 0 });

      expect(loggedNumbers(await server.getSession(sessionId))).toEqual([1]);
      expect(await services.offlineQueue.pending()).toEqual([]);
      expect(loggedNumbers(await mediator.send(getSessionDetail(sessionId)))).toEqual([1]);
    });

    it('treats a Rejected answer as done and drops that set locally', async () => {
      const { mediator, network, sessionId, setFor, sync, services } = await setupSession();
      network.online = false;
      await mediator.send(logSet(sessionId, setFor(1, { exerciseId: 'not-in-it' })));
      await mediator.send(logSet(sessionId, setFor(2)));
      network.online = true;

      expect(await sync()).toEqual({ replayed: 2, remaining: 0 });

      expect(await services.offlineQueue.pending()).toEqual([]);
      expect((await services.sessionLog.read(sessionId)).sets.map((s) => s.setNumber)).toEqual([2]);
    });

    it('stops at the first network failure and keeps it and the rest, then resumes in order', async () => {
      const { received, wrapApi } = recordingApi(2);
      const { mediator, network, sessionId, setFor, services, sync, server } = await setupSession({
        wrapApi,
      });
      network.online = false;
      for (const number of [1, 2, 3]) await mediator.send(logSet(sessionId, setFor(number)));
      network.online = true;

      expect(await sync()).toEqual({ replayed: 1, remaining: 2 });
      expect(await services.offlineQueue.pending()).toHaveLength(2);
      expect(loggedNumbers(await mediator.send(getSessionDetail(sessionId)))).toEqual([1, 2, 3]);

      expect(await sync()).toEqual({ replayed: 2, remaining: 0 });
      expect(received).toEqual([1, 2, 3]);
      expect(loggedNumbers(await server.getSession(sessionId))).toEqual([1, 2, 3]);
    });

    it('keeps everything when the server errors', async () => {
      const failing = (api: ApiClient): ApiClient => ({
        ...api,
        logSet: async () => {
          throw new Error('boom');
        },
      });
      const { mediator, network, sessionId, setFor, services, sync } = await setupSession({
        wrapApi: failing,
      });
      network.online = false;
      await mediator.send(logSet(sessionId, setFor(1)));
      network.online = true;

      expect(await sync()).toEqual({ replayed: 0, remaining: 1 });
      expect(await services.offlineQueue.pending()).toHaveLength(1);
    });

    describe('a set the API refuses', () => {
      /** Fails the first LogSet call (the one for set 1) with the given error; later calls go through. */
      const failingFirst =
        (error: () => unknown) =>
        (api: ApiClient): ApiClient => {
          let calls = 0;
          return {
            ...api,
            logSet: async (sessionId, set) => {
              calls += 1;
              if (calls === 1) throw error();
              return api.logSet(sessionId, set);
            },
          };
        };

      async function queueTwoSets(wrapApi: (api: ApiClient) => ApiClient) {
        const setup = await setupSession({ wrapApi });
        setup.network.online = false;
        for (const number of [1, 2]) {
          await setup.mediator.send(logSet(setup.sessionId, setup.setFor(number)));
        }
        setup.network.online = true;
        return setup;
      }

      it.each([400, 403, 404, 410, 422])(
        'drops the entry on a %i so it cannot block the sets behind it',
        async (status) => {
          const { services, sync, server, sessionId } = await queueTwoSets(
            failingFirst(() => new ApiError(status)),
          );

          expect(await sync()).toEqual({ replayed: 2, remaining: 0 });

          expect(await services.offlineQueue.pending()).toEqual([]);
          expect(loggedNumbers(await server.getSession(sessionId))).toEqual([2]);
        },
      );

      it.each([400, 404, 422])(
        'also takes the refused set back off the device on a %i, and keeps the others',
        async (status) => {
          const { services, sync, sessionId } = await queueTwoSets(
            failingFirst(() => new ApiError(status)),
          );

          await sync();

          const sets = (await services.sessionLog.read(sessionId)).sets;
          expect(sets.map(({ setNumber }) => setNumber)).toEqual([2]);
        },
      );

      it('takes a refused finish back off the device when its entry is dropped', async () => {
        const { mediator, network, sessionId, services, sync } = await setupSession({
          wrapApi: (api) => ({
            ...api,
            finishSession: async () => {
              throw new ApiError(422);
            },
          }),
        });
        network.online = false;
        await mediator.send(finishSession(sessionId, { id: newId(), rpe: 8 }));
        expect((await services.sessionLog.read(sessionId)).finish).not.toBeNull();
        network.online = true;

        expect(await sync()).toEqual({ replayed: 1, remaining: 0 });

        expect((await services.sessionLog.read(sessionId)).finish).toBeNull();
        expect((await mediator.send(getSessionDetail(sessionId))).finished).toBeNull();
      });

      it.each([401, 408, 429, 500, 502, 503])(
        'keeps the entry and everything behind it on a %i, then sends them once it clears',
        async (status) => {
          const { services, sync, server, sessionId } = await queueTwoSets(
            failingFirst(() => new ApiError(status)),
          );

          expect(await sync()).toEqual({ replayed: 0, remaining: 2 });
          expect(await services.offlineQueue.pending()).toHaveLength(2);

          expect(await sync()).toEqual({ replayed: 2, remaining: 0 });
          expect(loggedNumbers(await server.getSession(sessionId))).toEqual([1, 2]);
        },
      );

      it('keeps the entry when the network fails', async () => {
        const { services, sync } = await queueTwoSets(failingFirst(unreachable));

        expect(await sync()).toEqual({ replayed: 0, remaining: 2 });
        expect(await services.offlineQueue.pending()).toHaveLength(2);
      });

      it('drops an entry whose request no longer parses, and one of an unknown type', async () => {
        const { services, sync, server, sessionId, setFor } = await setupSession();
        await services.offlineQueue.enqueue({
          type: 'LogSet',
          sessionId,
          set: { ...setFor(1), rpe: 5 },
        } as never);
        await services.offlineQueue.enqueue({ type: 'RetiredRequest' });
        await services.offlineQueue.enqueue({ type: 'LogSet', sessionId, set: setFor(2) } as never);

        expect(await sync()).toEqual({ replayed: 3, remaining: 0 });
        expect(loggedNumbers(await server.getSession(sessionId))).toEqual([2]);
      });

      it('takes the local row back for an entry that no longer parses, and survives a malformed one', async () => {
        const { services, sync, sessionId, setFor } = await setupSession();
        const stale = setFor(1, { rpe: 5 });
        await services.sessionLog.addSet(sessionId, stale);
        await services.offlineQueue.enqueue({ type: 'LogSet', sessionId, set: stale } as never);
        await services.offlineQueue.enqueue({ type: 'LogSet', sessionId } as never);

        expect(await sync()).toEqual({ replayed: 2, remaining: 0 });

        expect((await services.sessionLog.read(sessionId)).sets).toEqual([]);
      });
    });

    it('shares one run between concurrent syncs (single-flight)', async () => {
      const { received, wrapApi } = recordingApi();
      const { mediator, network, sessionId, setFor, sync } = await setupSession({ wrapApi });
      network.online = false;
      for (const number of [1, 2]) await mediator.send(logSet(sessionId, setFor(number)));
      network.online = true;

      const first = sync();
      const second = sync();
      const results = await Promise.all([first, second]);

      expect(second).toBe(first);
      expect(results).toEqual([
        { replayed: 2, remaining: 0 },
        { replayed: 2, remaining: 0 },
      ]);
      expect(received).toEqual([1, 2]);
      expect(await sync()).toEqual({ replayed: 0, remaining: 0 });
    });
  });

  describe('finishing', () => {
    it('stores Load = RPE x minutes online', async () => {
      const { mediator, sessionId, server } = await setupSession();

      const result = await mediator.send(
        finishSession(sessionId, { id: newId(), rpe: 8, minutes: 40 }),
      );

      expect(result).toMatchObject({ status: RecordStatus.Saved, recorded: true });
      expect((await server.getSession(sessionId)).finished).toMatchObject({ load: 320 });
    });

    it('shows a finish made offline right away, then syncs it with the planned minutes by default', async () => {
      const { mediator, network, sessionId, setFor, sync, server, detail } = await setupSession();
      network.online = false;
      await mediator.send(logSet(sessionId, setFor(1)));

      expect(await mediator.send(finishSession(sessionId, { id: newId(), rpe: 7 }))).toBe(
        QUEUED_RESULT,
      );
      const offlineDetail = await mediator.send(getSessionDetail(sessionId));
      expect(offlineDetail.finished).toMatchObject({ rpe: 7, minutes: detail.minutes });
      expect(offlineDetail.finished?.load).toBe(7 * detail.minutes);

      network.online = true;
      expect(await sync()).toEqual({ replayed: 2, remaining: 0 });
      expect((await server.getSession(sessionId)).finished).toMatchObject({
        rpe: 7,
        minutes: detail.minutes,
        load: 7 * detail.minutes,
      });
      expect((await mediator.send(getSessionDetail(sessionId))).finished).toMatchObject({
        load: 7 * detail.minutes,
      });
    });

    it('stamps the local finish with the injected wall-clock time, not the real one', async () => {
      const { mediator, network, sessionId, services } = await setupSession();
      network.online = false;

      await mediator.send(finishSession(sessionId, { id: newId(), rpe: 7 }));

      expect((await services.sessionLog.read(sessionId)).finish?.recordedAt).toBe(
        TEST_CLOCK.wallTime,
      );
    });

    it('ignores a second finish and returns the stored one', async () => {
      const { mediator, sessionId, server } = await setupSession();
      await mediator.send(finishSession(sessionId, { id: newId(), rpe: 8, minutes: 40 }));

      const again = await mediator.send(
        finishSession(sessionId, { id: newId(), rpe: 3, minutes: 10 }),
      );

      expect(again).toMatchObject({ recorded: false, finished: { rpe: 8, load: 320 } });
      expect((await server.getSession(sessionId)).finished).toMatchObject({ rpe: 8 });
    });

    it('rejects a set that arrives after the Session was finished', async () => {
      const { mediator, sessionId, setFor } = await setupSession();
      await mediator.send(finishSession(sessionId, { id: newId(), rpe: 8 }));

      expect(await mediator.send(logSet(sessionId, setFor(1)))).toMatchObject({
        status: RecordStatus.Rejected,
      });
    });
  });

  describe('log-safe pipeline', () => {
    it('keeps weights, reps, RPE and ids out of the log lines, queued or not', async () => {
      const { mediator, network, sessionId, setFor, logLines, sync } = await setupSession();
      const set = setFor(1, { weightKg: 87.5, reps: 11, rpe: 9 });
      const finish = { id: newId(), rpe: 9, minutes: 61 };

      await mediator.send(logSet(sessionId, set));
      network.online = false;
      await mediator.send(logSet(sessionId, setFor(2, { weightKg: 87.5, reps: 11, rpe: 9 })));
      await mediator.send(finishSession(sessionId, finish));
      network.online = true;
      await sync();
      await mediator.send(getSessionDetail(sessionId));
      await mediator.send(logSet(sessionId, setFor(3, { rpe: 5 }))).catch(() => undefined);

      const text = JSON.stringify(logLines);
      for (const secret of ['87.5', '"reps"', '61', sessionId, set.id, finish.id, set.exerciseId]) {
        expect(text).not.toContain(secret);
      }
      for (const line of logLines) {
        expect(Object.keys(line).sort()).toEqual(['durationMs', 'outcome', 'requestType']);
      }
      expect(logLines.map(({ outcome }) => outcome)).toContain(RequestOutcome.Queued);
      expect(logLines.map(({ outcome }) => outcome)).toContain(RequestOutcome.Failure);
    });
  });

  describe('with the IndexedDB adapters', () => {
    function dexieServices(indexedDB: IDBFactory): Partial<Services> {
      const database = createLocalDatabase({ indexedDB, IDBKeyRange });
      return {
        offlineQueue: createDexieOfflineQueue(database),
        sessionLog: createDexieSessionLog(database),
        activityLog: createDexieActivityLog(database),
        planCache: createDexiePlanCache(database),
        localData: createDexieLocalData(database),
      };
    }

    it('survives a reload: queued sets and the finish are still there, shown and then synced in order', async () => {
      const indexedDB = new IDBFactory();
      const first = await setupSession({ services: dexieServices(indexedDB) });
      first.network.online = false;
      for (const number of [1, 2]) {
        await first.mediator.send(logSet(first.sessionId, first.setFor(number)));
      }
      await first.mediator.send(finishSession(first.sessionId, { id: newId(), rpe: 8 }));

      // A new app instance on the same device: new adapters over the same IndexedDB, same server.
      const second = reloadSession(first, dexieServices(indexedDB));

      expect(await second.services.offlineQueue.pending()).toHaveLength(3);
      const shown = await second.mediator.send(getSessionDetail(first.sessionId));
      expect(loggedNumbers(shown)).toEqual([1, 2]);
      expect(shown.finished).not.toBeNull();

      second.network.online = true;
      expect(await second.sync()).toEqual({ replayed: 3, remaining: 0 });
      const stored = await first.server.getSession(first.sessionId);
      expect(loggedNumbers(stored)).toEqual([1, 2]);
      expect(stored.finished).not.toBeNull();
    });
  });
});
