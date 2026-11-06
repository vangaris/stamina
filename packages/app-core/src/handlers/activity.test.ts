import {
  ActivityRejection,
  ApiError,
  RecordStatus,
  SportKind,
  type ApiClient,
  type LogActivity,
} from '@stamina/contracts';
import {
  activityLoad,
  addDays,
  Intensity,
  LaunchSport,
  MAX_ACTIVITY_FUTURE_DAYS,
  weekdayOf,
} from '@stamina/domain';
import { newId } from '@stamina/ids';
import { describe, expect, it } from 'vitest';
import { QUEUED_RESULT } from '../config.ts';
import { createAppSync } from '../create-app-sync.ts';
import { createServices } from '../create-services.ts';
import { ServicesMode } from '../enums/services-mode.ts';
import { AppErrorCode, getWeekLoad, logActivity } from '../index.ts';
import { buildProfileAnswers } from '../testing/build-profile-answers.ts';
import { signedUp } from '../testing/signed-up.ts';

const MINUTES = 60;
const today = () => new Date().toISOString().slice(0, 10);

const activityOn = (date: string, overrides: Partial<LogActivity> = {}): LogActivity => ({
  id: newId(),
  sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
  date,
  minutes: MINUTES,
  intensity: Intensity.Hard,
  hot: false,
  ...overrides,
});

/** A signed-up person who plays today's weekday, with a switch for the network and a sync runner. */
async function setup(wrapApi?: (api: ApiClient) => ApiClient) {
  const network = { online: true };
  const base = createServices({ mode: ServicesMode.Test });
  const ready = await signedUp(buildProfileAnswers({ playDays: [weekdayOf(today())] }), {
    api: wrapApi ? wrapApi(base.api) : base.api,
    auth: base.auth,
    network: { isOnline: () => network.online },
  });
  const sync = createAppSync({ services: ready.services, stores: ready.stores });
  return { ...ready, network, sync, server: base.api };
}

describe('logging an Activity through the mediator', () => {
  it('writes the Activity locally, sends it, and shows its Load in the week', async () => {
    const { mediator, services, server } = await setup();
    const activity = activityOn(today());

    const result = await mediator.send(logActivity(activity));

    expect(result).toMatchObject({ status: RecordStatus.Saved, recorded: true });
    expect((await services.activityLog.list()).map((row) => row.activity)).toEqual([activity]);
    const week = await mediator.send(getWeekLoad());
    expect(week.activityLoad).toBe(activityLoad(activity.intensity, activity.minutes));
    expect(week.activities.map(({ id }) => id)).toEqual([activity.id]);
    expect(week.plannedActivities.map(({ loggedActivityId }) => loggedActivityId)).toEqual([
      activity.id,
    ]);
    expect((await server.getWeekLoad()).activities).toHaveLength(1);
    expect(await services.offlineQueue.pending()).toEqual([]);
  });

  it('refuses an invalid Activity before anything is written or queued', async () => {
    const { mediator, services, network } = await setup();

    for (const online of [true, false]) {
      network.online = online;
      await expect(
        mediator.send(logActivity(activityOn(today(), { minutes: 0 }))),
      ).rejects.toMatchObject({ code: AppErrorCode.ValidationFailed });
    }

    expect(await services.activityLog.list()).toEqual([]);
    expect(await services.offlineQueue.pending()).toEqual([]);
  });

  it('answers Rejected for a date too far ahead and drops the Activity locally', async () => {
    const { mediator, services } = await setup();
    const old = addDays(today(), MAX_ACTIVITY_FUTURE_DAYS + 1);

    const result = await mediator.send(logActivity(activityOn(old)));

    expect(result).toEqual({
      status: RecordStatus.Rejected,
      reason: ActivityRejection.DateOutOfRange,
    });
    expect(await services.activityLog.list()).toEqual([]);
  });

  describe('offline', () => {
    it('queues the Activity, keeps it on the device and counts it in the week', async () => {
      const { mediator, network, services } = await setup();
      await mediator.send(getWeekLoad());
      network.online = false;
      const activity = activityOn(today());

      expect(await mediator.send(logActivity(activity))).toBe(QUEUED_RESULT);

      expect((await services.activityLog.list()).map((row) => row.activity.id)).toEqual([
        activity.id,
      ]);
      expect(await services.offlineQueue.pending()).toHaveLength(1);
      const week = await mediator.send(getWeekLoad());
      expect(week.activityLoad).toBe(activityLoad(activity.intensity, activity.minutes));
      expect(week.load).toBe(week.sessionLoad + week.activityLoad);
      expect(week.activities[0]).toMatchObject({ id: activity.id, planned: true });
    });

    it('replays it on reconnect once, and the week does not count it twice', async () => {
      const { mediator, network, sync, server } = await setup();
      await mediator.send(getWeekLoad());
      network.online = false;
      const activity = activityOn(today());
      await mediator.send(logActivity(activity));
      network.online = true;

      expect(await sync()).toEqual({ replayed: 1, remaining: 0 });
      expect(await sync()).toEqual({ replayed: 0, remaining: 0 });

      expect((await server.getWeekLoad()).activities.map(({ id }) => id)).toEqual([activity.id]);
      const week = await mediator.send(getWeekLoad());
      expect(week.activities).toHaveLength(1);
      expect(week.activityLoad).toBe(activityLoad(activity.intensity, activity.minutes));
    });

    it('rejects Offline for a week never fetched', async () => {
      const { mediator, network } = await setup();
      network.online = false;

      await expect(mediator.send(getWeekLoad())).rejects.toMatchObject({
        code: AppErrorCode.Offline,
      });
    });

    it('queues the Activity when the send cannot reach the server, and a sync delivers it', async () => {
      let calls = 0;
      const { mediator, services, sync, server } = await setup((api) => ({
        ...api,
        logActivity: async (activity) => {
          calls += 1;
          if (calls === 1) throw new TypeError('Failed to fetch');
          return api.logActivity(activity);
        },
      }));

      expect(await mediator.send(logActivity(activityOn(today())))).toBe(QUEUED_RESULT);
      expect(await services.offlineQueue.pending()).toHaveLength(1);
      expect(await sync()).toEqual({ replayed: 1, remaining: 0 });
      expect((await server.getWeekLoad()).activities).toHaveLength(1);
    });
  });

  describe('a permanent client error', () => {
    it.each([400, 404, 422])(
      'on an online send (%i) takes the Activity off the device and queues nothing',
      async (status) => {
        const { mediator, services } = await setup((api) => ({
          ...api,
          logActivity: async () => {
            throw new ApiError(status);
          },
        }));

        await expect(mediator.send(logActivity(activityOn(today())))).rejects.toBeDefined();

        expect(await services.activityLog.list()).toEqual([]);
        expect(await services.offlineQueue.pending()).toEqual([]);
      },
    );

    it('on a replay drops the queued Activity and its local row', async () => {
      const { mediator, network, services, sync } = await setup((api) => ({
        ...api,
        logActivity: async () => {
          throw new ApiError(422);
        },
      }));
      network.online = false;
      await mediator.send(logActivity(activityOn(today())));
      network.online = true;

      expect(await sync()).toEqual({ replayed: 1, remaining: 0 });

      expect(await services.activityLog.list()).toEqual([]);
      expect(await services.offlineQueue.pending()).toEqual([]);
    });
  });
});
