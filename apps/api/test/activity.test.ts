import {
  ActivityRejection,
  ApiPath,
  HttpMethod,
  RecordStatus,
  SportKind,
  activityPath,
  ActivitySubpath,
  userExportSchema,
} from '@stamina/contracts';
import {
  ACTIVITY_RPE_BY_INTENSITY,
  ActivitySource,
  Intensity,
  LaunchSport,
  Weekday,
  activityLoad,
} from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { activity, session } from '../src/db/schema.ts';
import type { UserTx } from '../src/db/types.ts';
import { withUser } from '../src/db/with-user.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { EXERCISE_DATA_DIR } from '../src/exercises/node.ts';
import { activityOf, getWeek, insertActivity, postActivity } from './support/activity-fixtures.ts';
import {
  PROGRAM_NOW,
  PROGRAM_STARTS_ON,
  approveSport,
  padelPersona,
  programUser,
} from './support/program-fixtures.ts';
import { PG_INSUFFICIENT_PRIVILEGE, type TestApi } from './support/safety-fixtures.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import { postFinish, sessionsOf } from './support/session-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

/** A Sunday inside the first Program week (Fri 2026-11-06 to Thu 2026-11-12). */
const TODAY = '2026-11-08';
const SUNDAY_NOON = new Date(`${TODAY}T12:00:00.000Z`);
/** A play day (Friday) and a day off (Saturday) of the padel persona, both in the past this week. */
const PLAY_DAY = '2026-11-06';
const DAY_OFF = '2026-11-07';

describe('Activities and Load', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;
  let clock = PROGRAM_NOW;

  beforeAll(async () => {
    scratch = await createScratchDatabase(EXERCISE_DATA_DIR);
    api = await startTestApi({ databaseUrl: scratch.url, now: () => clock });
    await approveSport(api, LaunchSport.Padel);
  });
  afterAll(async () => {
    await api.close();
    await scratch.drop();
  });

  /** A fresh player with a Program (made on `PROGRAM_NOW`, so weeks start on Friday); then it is Sunday. */
  const player = async (submission = padelPersona()) => {
    clock = PROGRAM_NOW;
    const user = await programUser(api, { submission });
    const { week } = await sessionsOf(user);
    clock = SUNDAY_NOON;
    return { user, week };
  };

  describe('logging', () => {
    it('stores the Load as RPE times minutes for each intensity, whatever the client thinks', async () => {
      const { user } = await player();

      for (const intensity of Object.values(Intensity)) {
        const entry = activityOf(PLAY_DAY, { intensity, minutes: 50 });
        const { status, result } = await postActivity(user, entry);

        expect(status).toBe(200);
        expect(result).toEqual({
          status: RecordStatus.Saved,
          recorded: true,
          activity: {
            ...entry,
            rpe: ACTIVITY_RPE_BY_INTENSITY[intensity],
            load: ACTIVITY_RPE_BY_INTENSITY[intensity] * 50,
            planned: true,
            source: ActivitySource.Manual,
            loggedAt: expect.any(String),
          },
        });
      }
    });

    it('ignores a Load sent by the client', async () => {
      const { user } = await player();
      const entry = { ...activityOf(PLAY_DAY), rpe: 1, load: 1 };

      const { result } = await postActivity(user, entry);

      expect(result).toMatchObject({
        activity: { load: activityLoad(entry.intensity, entry.minutes) },
      });
    });

    it('keeps the sport the person typed for an other sport', async () => {
      const { user } = await player();
      const entry = activityOf(DAY_OFF, { sport: { kind: SportKind.Other, name: 'Pickleball' } });

      const { result } = await postActivity(user, entry);

      expect(result).toMatchObject({ activity: { sport: entry.sport } });
    });

    it('ignores a replay of an id, changing nothing', async () => {
      const { user } = await player();
      const entry = activityOf(PLAY_DAY);
      const first = await postActivity(user, entry);

      const replay = await postActivity(user, {
        ...entry,
        minutes: 200,
        intensity: Intensity.Hard,
      });

      expect(replay.status).toBe(200);
      expect(replay.result).toEqual({
        status: RecordStatus.Saved,
        recorded: false,
        activity: (first.result as { activity: unknown }).activity,
      });
      expect(
        await api.db.select().from(activity).where(eq(activity.userId, user.userId)),
      ).toHaveLength(1);
    });

    it('rejects a day more than a day ahead, and stores nothing', async () => {
      const { user } = await player();

      const { status, result } = await postActivity(user, activityOf('2026-11-10'));

      expect(status).toBe(422);
      expect(result).toEqual({
        status: RecordStatus.Rejected,
        reason: ActivityRejection.DateOutOfRange,
      });
      expect(await api.db.select().from(activity).where(eq(activity.userId, user.userId))).toEqual(
        [],
      );
    });

    it('accepts tomorrow, and a day long past, as an Activity logged offline arrives late', async () => {
      const { user } = await player();

      for (const date of ['2026-11-09', '2026-09-01']) {
        expect((await postActivity(user, activityOf(date))).status).toBe(200);
      }
    });

    it('marks an Activity planned on a play day and not off it', async () => {
      const { user } = await player();

      const onPlayDay = await postActivity(user, activityOf(PLAY_DAY));
      const offPlayDay = await postActivity(user, activityOf(DAY_OFF));

      expect(onPlayDay.result).toMatchObject({ activity: { planned: true } });
      expect(offPlayDay.result).toMatchObject({ activity: { planned: false } });
    });

    it('answers 400 for a body that is not a valid Activity, and stores nothing', async () => {
      const { user } = await player();
      const good = activityOf(PLAY_DAY);
      const bad: unknown[] = [
        undefined,
        {},
        { ...good, id: 'x' },
        { ...good, date: '08/11/2026' },
        { ...good, minutes: 14 },
        { ...good, minutes: 301 },
        { ...good, minutes: 60.5 },
        { ...good, intensity: 'brutal' },
        { ...good, sport: { kind: SportKind.Other } },
        { ...good, hot: 'yes' },
      ];

      for (const body of bad) {
        const response = await user.call(HttpMethod.Post, activityPath(), body);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
      }
      expect(await api.db.select().from(activity).where(eq(activity.userId, user.userId))).toEqual(
        [],
      );
    });

    it('answers 401 without a token', async () => {
      const { user } = await player();

      const post = await user.call(HttpMethod.Post, activityPath(), activityOf(PLAY_DAY), false);
      const get = await user.call(
        HttpMethod.Get,
        activityPath(ActivitySubpath.Week),
        undefined,
        false,
      );

      expect(post.status).toBe(401);
      expect(get.status).toBe(401);
    });
  });

  describe('the week', () => {
    it('plans an Activity on each play day with the profile’s duration and effort', async () => {
      const { user } = await player();

      const week = await getWeek(user);

      expect(week.startsOn).toBe(PROGRAM_STARTS_ON);
      expect(week.plannedActivities).toEqual([
        {
          date: '2026-11-06',
          weekday: Weekday.Fri,
          sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
          minutes: 90,
          intensity: Intensity.Hard,
          loggedActivityId: null,
        },
        {
          date: '2026-11-10',
          weekday: Weekday.Tue,
          sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
          minutes: 90,
          intensity: Intensity.Hard,
          loggedActivityId: null,
        },
      ]);
    });

    it('plans nothing before the Program starts, so the signup day has no planned Activities', async () => {
      clock = PROGRAM_NOW;
      const user = await programUser(api, { submission: padelPersona() });

      const week = await getWeek(user);
      const before = await postActivity(user, activityOf('2026-11-03'));

      expect(week.startsOn).toBe('2026-10-30');
      expect(week.plannedActivities).toEqual([]);
      expect(before.result).toMatchObject({ activity: { planned: false } });
    });

    it('plans nothing when the sport varies', async () => {
      const { user } = await player({ ...padelPersona(), playDays: [], playVaries: true });

      const week = await getWeek(user);

      expect(week.plannedActivities).toEqual([]);
    });

    it('fills a planned day with the Activity logged on it', async () => {
      const { user } = await player();
      const filling = activityOf(PLAY_DAY);
      await postActivity(user, filling);
      await postActivity(user, activityOf(DAY_OFF));

      const week = await getWeek(user);

      expect(
        week.plannedActivities.map(({ date, loggedActivityId }) => [date, loggedActivityId]),
      ).toEqual([
        [PLAY_DAY, filling.id],
        ['2026-11-10', null],
      ]);
    });

    it('adds Session Loads and Activity Loads into the week’s Load', async () => {
      const { user, week: program } = await player();
      const [first] = program.sessions;
      await postFinish(user, first!.id, { id: crypto.randomUUID(), rpe: 7, minutes: 40 });
      await postActivity(user, activityOf(PLAY_DAY, { intensity: Intensity.Hard, minutes: 60 }));
      await postActivity(user, activityOf(DAY_OFF, { intensity: Intensity.Easy, minutes: 30 }));

      const week = await getWeek(user);

      expect(week.sessionLoad).toBe(7 * 40);
      expect(week.activityLoad).toBe(8 * 60 + 4 * 30);
      expect(week.load).toBe(7 * 40 + 8 * 60 + 4 * 30);
      expect(week.activities.map(({ date, load }) => [date, load])).toEqual([
        [PLAY_DAY, 8 * 60],
        [DAY_OFF, 4 * 30],
      ]);
    });

    it('counts a Session Load on the day the Session was planned for, and an unfinished Session as none', async () => {
      const { user, week: program } = await player();
      const [first, second] = program.sessions;
      await postFinish(user, first!.id, { id: crypto.randomUUID(), rpe: 5, minutes: 30 });
      await postFinish(user, second!.id, { id: crypto.randomUUID(), rpe: 6, minutes: 30 });
      // Move the second Session to the week before, as the table owner.
      await api.db.update(session).set({ date: '2026-11-02' }).where(eq(session.id, second!.id));

      const week = await getWeek(user);

      expect(week.sessionLoad).toBe(5 * 30);
      expect(week.previous).toEqual([{ startsOn: '2026-10-30', load: 6 * 30 }]);
      expect(week.average).toBe(6 * 30);
    });

    it('compares the week with the user’s own average of the weeks before, rest weeks counting as zero', async () => {
      const { user } = await player();
      // Weeks from the Program start: 10-09 (before any data), 10-16 (data), 10-23 (rest), 10-30 (data).
      const early = await insertActivity(api, user, '2026-10-17', 60);
      const late = await insertActivity(api, user, '2026-11-01', 30, Intensity.Hard);
      await postActivity(user, activityOf(PLAY_DAY));

      const week = await getWeek(user);

      expect(week.previous).toEqual([
        { startsOn: '2026-10-16', load: early },
        { startsOn: '2026-10-23', load: 0 },
        { startsOn: '2026-10-30', load: late },
      ]);
      expect(week.average).toBe(Math.round((early + late) / 3));
      expect(week.load).toBe(activityLoad(Intensity.Moderate, 60));
    });

    it('has no average until an earlier week has data', async () => {
      const { user } = await player();
      await postActivity(user, activityOf(PLAY_DAY));

      const week = await getWeek(user);

      expect(week.previous).toEqual([]);
      expect(week.average).toBeNull();
      expect(week.load).toBeGreaterThan(0);
    });

    it('shows an empty week for a person with no Activities', async () => {
      const { user } = await player();

      const week = await getWeek(user);

      expect(week).toMatchObject({
        sessionLoad: 0,
        activityLoad: 0,
        load: 0,
        average: null,
        activities: [],
      });
    });
  });

  describe('privacy', () => {
    it('never shows or counts another user’s Activities', async () => {
      const { user } = await player();
      const stranger = (await player()).user;
      await postActivity(stranger, activityOf(PLAY_DAY));
      await insertActivity(api, stranger, '2026-11-01', 90);

      const week = await getWeek(user);

      expect(week).toMatchObject({ load: 0, average: null, activities: [] });
      expect(
        week.plannedActivities.every(({ loggedActivityId }) => loggedActivityId === null),
      ).toBe(true);
    });

    it('answers 409 and changes nothing when the id is another user’s Activity', async () => {
      const { user } = await player();
      const stranger = (await player()).user;
      const theirs = activityOf(PLAY_DAY);
      await postActivity(stranger, theirs);

      const response = await user.call(HttpMethod.Post, activityPath(), theirs);

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: ApiErrorCode.IdTaken });
      expect(await api.db.select().from(activity).where(eq(activity.userId, user.userId))).toEqual(
        [],
      );
    });

    it('lets the app role neither write another user’s rows nor change or delete its own', async () => {
      const { user } = await player();
      const stranger = (await player()).user;
      const entry = activityOf(PLAY_DAY);
      await postActivity(user, entry);

      await expect(
        withUser(api.db, stranger.userId, (tx) =>
          tx.insert(activity).values({
            id: crypto.randomUUID(),
            userId: user.userId,
            sportKind: SportKind.Launch,
            launchSport: LaunchSport.Padel,
            otherSportName: null,
            date: PLAY_DAY,
            minutes: 60,
            intensity: Intensity.Easy,
            rpe: 4,
            load: 240,
            planned: false,
            hot: false,
            source: ActivitySource.Manual,
          }),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      for (const change of [
        (tx: UserTx) => tx.update(activity).set({ minutes: 15 }).where(eq(activity.id, entry.id)),
        (tx: UserTx) => tx.delete(activity).where(eq(activity.id, entry.id)),
      ]) {
        await expect(withUser(api.db, user.userId, change)).rejects.toMatchObject({
          cause: { code: PG_INSUFFICIENT_PRIVILEGE },
        });
      }
    });

    it('is part of the export oldest first, and goes with the account', async () => {
      const { user } = await player();
      const first = activityOf(PLAY_DAY);
      const second = activityOf(DAY_OFF, { sport: { kind: SportKind.Other, name: 'Squash' } });
      const stored = [
        (await postActivity(user, first)).result,
        (await postActivity(user, second)).result,
      ].map((result) => (result as { activity: unknown }).activity);

      const exported = userExportSchema.parse(
        await (await user.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );

      expect(exported.activities).toEqual(stored);

      expect((await user.call(HttpMethod.Delete, ApiPath.Me)).status).toBe(204);
      expect(await api.db.select().from(activity).where(eq(activity.userId, user.userId))).toEqual(
        [],
      );
    });
  });
});
