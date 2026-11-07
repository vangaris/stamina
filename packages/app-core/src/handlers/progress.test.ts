import { SportKind, type LogActivity } from '@stamina/contracts';
import {
  activityLoad,
  Intensity,
  LaunchSport,
  MAX_BODY_WEIGHT_KG,
  MIN_BODY_WEIGHT_KG,
  VerdictKind,
  weekdayOf,
} from '@stamina/domain';
import { newId } from '@stamina/ids';
import { describe, expect, it } from 'vitest';
import { createServices } from '../create-services.ts';
import { ServicesMode } from '../enums/services-mode.ts';
import { AppErrorCode, getProgress, logActivity, logWeighIn } from '../index.ts';
import { buildProfileAnswers } from '../testing/build-profile-answers.ts';
import { signedUp } from '../testing/signed-up.ts';

const today = () => new Date().toISOString().slice(0, 10);

const playedToday = (): LogActivity => ({
  id: newId(),
  sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
  date: today(),
  minutes: 60,
  intensity: Intensity.Hard,
  hot: false,
});

/** A signed-up person who plays today's weekday, with a switch for the network. */
async function setup() {
  const network = { online: true };
  const base = createServices({ mode: ServicesMode.Test });
  const ready = await signedUp(buildProfileAnswers({ playDays: [weekdayOf(today())] }), {
    api: base.api,
    auth: base.auth,
    network: { isOnline: () => network.online },
  });
  return { ...ready, network, server: base.api };
}

describe('getProgress through the mediator', () => {
  it('shows a fresh week: nothing done, today planned, no usual yet, a weigh-in due', async () => {
    const { mediator } = await setup();

    const progress = await mediator.send(getProgress());

    expect(progress.sessions).toEqual({ done: 0, planned: 0 });
    expect(progress.activities.logged).toBe(0);
    expect(progress.activities.planned).toBeGreaterThanOrEqual(1);
    expect(progress.average).toBeNull();
    expect(progress.weeks.at(-1)).toMatchObject({ startsOn: progress.weekStartsOn, done: 0 });
    expect(progress.verdict.kind).toBe(VerdictKind.NotEnoughHistory);
    expect(progress.weighIn).toEqual({ latest: null, due: true });
  });

  it('counts a logged Activity as done Load and takes it off the planned Load', async () => {
    const { mediator } = await setup();
    const before = (await mediator.send(getProgress())).weeks.at(-1)!;
    const activity = playedToday();

    await mediator.send(logActivity(activity));
    const progress = await mediator.send(getProgress());

    const current = progress.weeks.at(-1)!;
    expect(progress.activities.logged).toBe(1);
    expect(current.done).toBe(activityLoad(activity.intensity, activity.minutes));
    expect(current.planned).toBeLessThan(before.planned);
  });

  it('serves the last Progress fetched when there is no signal', async () => {
    const { mediator, network } = await setup();
    const online = await mediator.send(getProgress());
    network.online = false;

    expect(await mediator.send(getProgress())).toEqual(online);
  });

  it('rejects Offline when Progress was never fetched', async () => {
    const { mediator, network } = await setup();
    network.online = false;

    await expect(mediator.send(getProgress())).rejects.toMatchObject({
      code: AppErrorCode.Offline,
    });
  });
});

describe('logWeighIn through the mediator', () => {
  it('stores the weight in kilograms for today and ends the due state', async () => {
    const { mediator } = await setup();

    const result = await mediator.send(logWeighIn({ weightKg: 72.5 }));

    expect(result).toEqual({ date: today(), weightKg: 72.5 });
    expect((await mediator.send(getProgress())).weighIn).toEqual({
      latest: { date: today(), weightKg: 72.5 },
      due: false,
    });
  });

  it('keeps the latest weigh-in as the current weight', async () => {
    const { mediator } = await setup();

    await mediator.send(logWeighIn({ weightKg: 72.5 }));
    await mediator.send(logWeighIn({ weightKg: 71.8 }));

    expect((await mediator.send(getProgress())).weighIn.latest).toEqual({
      date: today(),
      weightKg: 71.8,
    });
  });

  it('is online only: offline it rejects Offline and nothing is stored', async () => {
    const { mediator, network, server } = await setup();
    network.online = false;

    await expect(mediator.send(logWeighIn({ weightKg: 72.5 }))).rejects.toMatchObject({
      code: AppErrorCode.Offline,
    });

    expect((await server.getProgress()).weighIn).toEqual({ latest: null, due: true });
  });

  it('rejects a weight outside the accepted range before anything is sent', async () => {
    const { mediator, server } = await setup();

    for (const weightKg of [MIN_BODY_WEIGHT_KG - 0.1, MAX_BODY_WEIGHT_KG + 0.1]) {
      await expect(mediator.send(logWeighIn({ weightKg }))).rejects.toMatchObject({
        code: AppErrorCode.ValidationFailed,
      });
    }

    expect((await server.getProgress()).weighIn.latest).toBeNull();
  });
});
