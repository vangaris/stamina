import { ApiPath, HttpMethod, userExportSchema, type ProgramWeek } from '@stamina/contracts';
import {
  Intensity,
  LaunchSport,
  MAX_BODY_WEIGHT_KG,
  MAX_WEIGH_IN_PAST_DAYS,
  MIN_BODY_WEIGHT_KG,
  VerdictKind,
  activityLoad,
  addDays,
  plannedSessionLoad,
} from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { session, weighIn } from '../src/db/schema.ts';
import type { UserTx } from '../src/db/types.ts';
import { withUser } from '../src/db/with-user.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { EXERCISE_DATA_DIR } from '../src/exercises/node.ts';
import { activityOf, insertActivity, postActivity } from './support/activity-fixtures.ts';
import {
  PROGRAM_NOW,
  PROGRAM_STARTS_ON,
  approveSport,
  padelPersona,
  programUser,
} from './support/program-fixtures.ts';
import { getProgress, insertWeighIn, postWeighIn } from './support/progress-fixtures.ts';
import {
  PG_INSUFFICIENT_PRIVILEGE,
  type FixtureUser,
  type TestApi,
} from './support/safety-fixtures.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import { postFinish, sessionsOf } from './support/session-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

/** The Sunday and the Thursday of the first Program week (Fri 2026-11-06 to Thu 2026-11-12). */
const SUNDAY = '2026-11-08';
const THURSDAY = '2026-11-12';
const SUNDAY_NOON = new Date(`${SUNDAY}T12:00:00.000Z`);
const THURSDAY_NOON = new Date(`${THURSDAY}T12:00:00.000Z`);
/** The padel persona's play days (Friday and Tuesday) and the week before the Program. */
const FIRST_PLAY_DAY = '2026-11-06';
const SECOND_PLAY_DAY = '2026-11-10';
const PREVIOUS_WEEK = '2026-10-30';
const PREVIOUS_WEEK_DAY = '2026-11-01';

/** The persona plays 90 minutes hard; a Session finished here is rated RPE 7 for 40 minutes. */
const PLAY_MINUTES = 90;
const PLAY_DAY_LOAD = activityLoad(Intensity.Hard, PLAY_MINUTES);
const FINISH = { rpe: 7, minutes: 40 };
const FINISHED_LOAD = FINISH.rpe * FINISH.minutes;

describe('Progress and the weekly weigh-in', () => {
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

  /** A fresh player with a Program made on `PROGRAM_NOW` (weeks start on Friday); then it is `now`. */
  const player = async (now = SUNDAY_NOON) => {
    clock = PROGRAM_NOW;
    const user = await programUser(api, { submission: padelPersona() });
    const { week } = await sessionsOf(user);
    clock = now;
    return { user, week };
  };

  const finishAll = async (user: FixtureUser, week: ProgramWeek) => {
    for (const { id } of week.sessions) {
      await postFinish(user, id, { id: crypto.randomUUID(), ...FINISH });
    }
  };

  /** Every Session finished and both play days logged on Thursday: nothing is planned, nothing is due. */
  const settledWeek = async () => {
    const { user, week } = await player(THURSDAY_NOON);
    await finishAll(user, week);
    for (const date of [FIRST_PLAY_DAY, SECOND_PLAY_DAY]) {
      await postActivity(
        user,
        activityOf(date, { minutes: PLAY_MINUTES, intensity: Intensity.Hard }),
      );
    }
    return { user, week, done: week.sessions.length * FINISHED_LOAD + 2 * PLAY_DAY_LOAD };
  };

  describe('GET /progress', () => {
    it('shows a fresh week: Sessions and the play day still to come planned, nothing done, no usual yet', async () => {
      const { user, week } = await player();

      const progress = await getProgress(user);

      const planned =
        week.sessions.reduce(
          (total, { minutes }) => total + plannedSessionLoad(week.block.weekInBlock, minutes),
          0,
        ) + PLAY_DAY_LOAD; // Friday has passed unlogged, so only Tuesday is still to come
      expect(progress).toMatchObject({
        weekStartsOn: PROGRAM_STARTS_ON,
        sessions: { done: 0, planned: week.sessions.length },
        activities: { logged: 0, planned: 2 },
        weeks: [{ startsOn: PROGRAM_STARTS_ON, done: 0, planned }],
        average: null,
        weighIn: { latest: null, due: true },
      });
      const due = week.sessions.filter(({ date }) => date < SUNDAY).length;
      expect(progress.verdict).toEqual({
        kind: due > 0 ? VerdictKind.SessionsBehind : VerdictKind.NotEnoughHistory,
        load: planned,
        average: null,
        sessionsDone: 0,
        sessionsPlanned: week.sessions.length,
      });
    });

    it('moves a finished Session and a logged Activity from planned to done', async () => {
      const { user, week } = await player();
      const [finished, ...rest] = week.sessions;
      await postFinish(user, finished!.id, { id: crypto.randomUUID(), ...FINISH });
      await postActivity(
        user,
        activityOf(FIRST_PLAY_DAY, { minutes: 60, intensity: Intensity.Hard }),
      );

      const progress = await getProgress(user);

      const plannedSessions = rest.reduce(
        (total, { minutes }) => total + plannedSessionLoad(week.block.weekInBlock, minutes),
        0,
      );
      expect(progress.sessions).toEqual({ done: 1, planned: week.sessions.length });
      expect(progress.activities).toEqual({ logged: 1, planned: 2 });
      expect(progress.weeks).toEqual([
        {
          startsOn: PROGRAM_STARTS_ON,
          done: FINISHED_LOAD + activityLoad(Intensity.Hard, 60),
          planned: plannedSessions + PLAY_DAY_LOAD,
        },
      ]);
    });

    it('lists the earlier weeks with data, then this week last, with the average', async () => {
      const { user } = await player();
      const earlier = await insertActivity(api, user, PREVIOUS_WEEK_DAY, 60);

      const progress = await getProgress(user);

      expect(progress.average).toBe(earlier);
      expect(progress.weeks.map(({ startsOn, done }) => [startsOn, done])).toEqual([
        [PREVIOUS_WEEK, earlier],
        [PROGRAM_STARTS_ON, 0],
      ]);
      expect(progress.weeks[0]!.planned).toBe(0);
      expect(progress.verdict.average).toBe(earlier);
    });

    it('counts a Session missed in an earlier week as planned Load in that week', async () => {
      const { user, week } = await player();
      await insertActivity(api, user, PREVIOUS_WEEK_DAY, 60);
      const moved = week.sessions[0]!;
      await api.db.update(session).set({ date: '2026-11-02' }).where(eq(session.id, moved.id));

      const progress = await getProgress(user);

      expect(progress.weeks[0]).toEqual({
        startsOn: PREVIOUS_WEEK,
        done: activityLoad(Intensity.Moderate, 60),
        planned: plannedSessionLoad(week.block.weekInBlock, moved.minutes),
      });
      expect(progress.sessions.planned).toBe(week.sessions.length - 1);
    });

    it('answers 401 without a token', async () => {
      const { user } = await player();

      const response = await user.call(HttpMethod.Get, ApiPath.Progress, undefined, false);

      expect(response.status).toBe(401);
    });
  });

  describe('the verdict', () => {
    it('says Sessions are behind while one due earlier in the week is not done', async () => {
      const { user, week } = await player(THURSDAY_NOON);
      expect(week.sessions.some(({ date }) => date < THURSDAY)).toBe(true);

      const { verdict } = await getProgress(user);

      expect(verdict).toMatchObject({ kind: VerdictKind.SessionsBehind, sessionsDone: 0 });
    });

    it('has no verdict on the Load until an earlier week has data', async () => {
      const { user, week, done } = await settledWeek();

      const { verdict } = await getProgress(user);

      expect(verdict).toEqual({
        kind: VerdictKind.NotEnoughHistory,
        load: done,
        average: null,
        sessionsDone: week.sessions.length,
        sessionsPlanned: week.sessions.length,
      });
    });

    it('says above the usual when the week passes 110 percent of the average', async () => {
      const { user, done } = await settledWeek();
      await insertActivity(api, user, PREVIOUS_WEEK_DAY, 15, Intensity.Easy);

      const { verdict } = await getProgress(user);

      expect(verdict).toMatchObject({ kind: VerdictKind.AboveUsual, load: done, average: 60 });
    });

    it('says below the usual when the week is under 90 percent of the average', async () => {
      const { user, done } = await settledWeek();
      let earlier = 0;
      for (let count = 0; count < 3; count++) {
        earlier += await insertActivity(api, user, PREVIOUS_WEEK_DAY, 300, Intensity.Hard);
      }

      const { verdict } = await getProgress(user);

      expect(done).toBeLessThan(earlier * 0.9);
      expect(verdict).toMatchObject({ kind: VerdictKind.BelowUsual, average: earlier });
    });

    it('says on track when the week is within 10 percent of the average', async () => {
      const { user, done } = await settledWeek();
      const minutes = done / activityLoad(Intensity.Hard, 1);
      expect(Number.isInteger(minutes)).toBe(true);
      await insertActivity(api, user, PREVIOUS_WEEK_DAY, minutes, Intensity.Hard);

      const { verdict, weeks } = await getProgress(user);

      expect(verdict).toMatchObject({ kind: VerdictKind.OnTrack, load: done, average: done });
      expect(weeks).toEqual([
        { startsOn: PREVIOUS_WEEK, done, planned: 0 },
        { startsOn: PROGRAM_STARTS_ON, done, planned: 0 },
      ]);
    });
  });

  describe('POST /weigh-ins', () => {
    it('stores the weight for today and ends the due state', async () => {
      const { user } = await player();

      const posted = await postWeighIn(user, { weightKg: 72.5 });
      const progress = await getProgress(user);

      expect(posted).toEqual({ status: 200, result: { date: SUNDAY, weightKg: 72.5 } });
      expect(progress.weighIn).toEqual({ latest: { date: SUNDAY, weightKg: 72.5 }, due: false });
    });

    it('is still due when the latest weigh-in is from an earlier week, and shows that one', async () => {
      const { user } = await player();
      await postWeighIn(user, { weightKg: 73, date: PREVIOUS_WEEK_DAY });

      const { weighIn: status } = await getProgress(user);

      expect(status).toEqual({ latest: { date: PREVIOUS_WEEK_DAY, weightKg: 73 }, due: true });
    });

    it('keeps the newest day as the latest, whatever order they arrive in, and every entry', async () => {
      const { user } = await player();
      await postWeighIn(user, { weightKg: 72.5 });
      await postWeighIn(user, { weightKg: 73, date: PREVIOUS_WEEK_DAY });
      await postWeighIn(user, { weightKg: 72.1 });

      const { weighIn: status } = await getProgress(user);

      expect(status.latest).toEqual({ date: SUNDAY, weightKg: 72.1 });
      expect(
        await api.db.select().from(weighIn).where(eq(weighIn.userId, user.userId)),
      ).toHaveLength(3);
    });

    it('accepts tomorrow, and a day long past', async () => {
      const { user } = await player();

      for (const date of ['2026-11-09', '2026-09-01']) {
        expect((await postWeighIn(user, { weightKg: 70, date })).status).toBe(200);
      }
    });

    it('rejects a day more than a day ahead with 400, and stores nothing', async () => {
      const { user } = await player();

      const response = await postWeighIn(user, { weightKg: 70, date: '2026-11-10' });

      expect(response.status).toBe(400);
      expect(await api.db.select().from(weighIn).where(eq(weighIn.userId, user.userId))).toEqual(
        [],
      );
    });

    it('rejects a day older than MAX_WEIGH_IN_PAST_DAYS, or a year the database cannot store, with 400', async () => {
      const { user } = await player();
      const oldest = addDays(SUNDAY, -MAX_WEIGH_IN_PAST_DAYS);
      expect((await postWeighIn(user, { weightKg: 70, date: oldest })).status).toBe(200);

      for (const date of [addDays(oldest, -1), '2000-01-01', '0000-01-01']) {
        const response = await postWeighIn(user, { weightKg: 70, date });
        expect(response.status).toBe(400);
      }
      expect(
        await api.db.select().from(weighIn).where(eq(weighIn.userId, user.userId)),
      ).toHaveLength(1);
    });

    it('accepts the bounds and answers 400 for a weight outside them or a body that is not one', async () => {
      const { user } = await player();
      for (const weightKg of [MIN_BODY_WEIGHT_KG, MAX_BODY_WEIGHT_KG]) {
        expect((await postWeighIn(user, { weightKg })).status).toBe(200);
      }
      const bad: unknown[] = [
        undefined,
        {},
        { weightKg: MIN_BODY_WEIGHT_KG - 0.01 },
        { weightKg: MAX_BODY_WEIGHT_KG + 0.01 },
        { weightKg: 0 },
        { weightKg: -70 },
        { weightKg: '72' },
        { weightKg: null },
        { weightKg: 70, date: '08/11/2026' },
      ];

      for (const body of bad) {
        const response = await user.call(HttpMethod.Post, ApiPath.WeighIns, body);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
      }
      expect(
        await api.db.select().from(weighIn).where(eq(weighIn.userId, user.userId)),
      ).toHaveLength(2);
    });

    it('answers 401 without a token', async () => {
      const { user } = await player();

      const response = await user.call(HttpMethod.Post, ApiPath.WeighIns, { weightKg: 70 }, false);

      expect(response.status).toBe(401);
    });

    it('is refused by the database for a weight outside the bounds, even as the table owner', async () => {
      const { user } = await player();

      await expect(insertWeighIn(api, user, SUNDAY, MIN_BODY_WEIGHT_KG - 1)).rejects.toThrow();
      await expect(insertWeighIn(api, user, SUNDAY, MAX_BODY_WEIGHT_KG + 1)).rejects.toThrow();
    });
  });

  describe('privacy', () => {
    it('never shows another user’s weigh-ins or Load in Progress', async () => {
      const { user } = await player();
      const stranger = (await player()).user;
      await postWeighIn(stranger, { weightKg: 90 });
      await postActivity(stranger, activityOf(FIRST_PLAY_DAY));
      await insertActivity(api, stranger, PREVIOUS_WEEK_DAY, 90);

      const progress = await getProgress(user);

      expect(progress.weighIn).toEqual({ latest: null, due: true });
      expect(progress.average).toBeNull();
      expect(progress.activities.logged).toBe(0);
      expect(progress.weeks.every(({ done }) => done === 0)).toBe(true);
    });

    it('lets the app role neither write another user’s rows nor change or delete its own', async () => {
      const { user } = await player();
      const stranger = (await player()).user;
      await postWeighIn(user, { weightKg: 72.5 });
      const [own] = await api.db.select().from(weighIn).where(eq(weighIn.userId, user.userId));

      await expect(
        withUser(api.db, stranger.userId, (tx) =>
          tx.insert(weighIn).values({ userId: user.userId, date: SUNDAY, weightKg: 60 }),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      for (const change of [
        (tx: UserTx) => tx.update(weighIn).set({ weightKg: 60 }).where(eq(weighIn.id, own!.id)),
        (tx: UserTx) => tx.delete(weighIn).where(eq(weighIn.id, own!.id)),
      ]) {
        await expect(withUser(api.db, user.userId, change)).rejects.toMatchObject({
          cause: { code: PG_INSUFFICIENT_PRIVILEGE },
        });
      }
    });

    it('reads only the caller’s rows as the app role', async () => {
      const { user } = await player();
      const stranger = (await player()).user;
      await postWeighIn(stranger, { weightKg: 90 });

      const seen = await withUser(api.db, user.userId, (tx) => tx.select().from(weighIn));

      expect(seen).toEqual([]);
    });

    it('is part of the export oldest first, and goes with the account', async () => {
      const { user } = await player();
      await postWeighIn(user, { weightKg: 73, date: PREVIOUS_WEEK_DAY });
      await postWeighIn(user, { weightKg: 72.5 });

      const exported = userExportSchema.parse(
        await (await user.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );

      expect(exported.weighIns).toEqual([
        {
          id: expect.any(String),
          date: PREVIOUS_WEEK_DAY,
          weightKg: 73,
          loggedAt: expect.any(String),
        },
        { id: expect.any(String), date: SUNDAY, weightKg: 72.5, loggedAt: expect.any(String) },
      ]);

      expect((await user.call(HttpMethod.Delete, ApiPath.Me)).status).toBe(204);
      expect(await api.db.select().from(weighIn).where(eq(weighIn.userId, user.userId))).toEqual(
        [],
      );
    });
  });
});
