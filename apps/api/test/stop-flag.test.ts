import {
  ApiPath,
  HttpMethod,
  ProgramRejection,
  RecordStatus,
  ScreeningRejection,
  StopFlagSubpath,
  stopFlagPath,
  userExportSchema,
  type Exercise,
  type ProgramWeek,
} from '@stamina/contracts';
import {
  BodyArea,
  Intensity,
  LaunchSport,
  ScreeningQuestion,
  ScreeningStatus,
  StartingLevel,
  StopFlag,
  TrainingMode,
  stopFlagEffect,
} from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { stopFlag } from '../src/db/schema.ts';
import type { UserTx } from '../src/db/types.ts';
import { withUser } from '../src/db/with-user.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { EXERCISE_DATA_DIR } from '../src/exercises/node.ts';
import { checkinOf, postCheckin } from './support/checkin-fixtures.ts';
import {
  PROGRAM_NOW,
  approveSport,
  getProgram,
  libraryById,
  padelPersona,
  postProgram,
  programUser,
  type ProgramUserOptions,
} from './support/program-fixtures.ts';
import {
  PG_INSUFFICIENT_PRIVILEGE,
  type FixtureUser,
  type TestApi,
} from './support/safety-fixtures.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import {
  getStopState,
  postConfirm,
  postRecheck,
  postStopFlag,
  stopFlagOf,
  NO_STOP,
} from './support/stop-flag-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

const TODAY = '2026-11-05';
const YESTERDAY = '2026-11-04';
const PAUSING_FLAGS = [
  StopFlag.ChestPain,
  StopFlag.Fainting,
  StopFlag.Breathlessness,
  StopFlag.Heartbeat,
  StopFlag.HeadKnock,
];

describe('stop flags', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;

  beforeAll(async () => {
    scratch = await createScratchDatabase(EXERCISE_DATA_DIR);
    api = await startTestApi({ databaseUrl: scratch.url, now: () => PROGRAM_NOW });
    await approveSport(api, LaunchSport.Padel);
  });
  afterAll(async () => {
    await api.close();
    await scratch.drop();
  });

  /** A cleared padel player with no Program yet. */
  const player = (options: ProgramUserOptions = {}) =>
    programUser(api, { submission: padelPersona(), ...options });
  /** Easy play means no hard days, so every Session is full and the area check is real. */
  const easyPlayer = (options: ProgramUserOptions = {}) =>
    programUser(api, {
      submission: { ...padelPersona(60), playIntensity: Intensity.Easy },
      ...options,
    });
  const rowsOf = (user: FixtureUser) =>
    api.db.select().from(stopFlag).where(eq(stopFlag.userId, user.userId));
  const generate = async (user: FixtureUser): Promise<ProgramWeek> => {
    const { status, result } = await postProgram(user);
    expect(status).toBe(200);
    if (result.status !== RecordStatus.Saved) throw new Error('expected a Program');
    return result.program;
  };
  const loadsArea = (library: Map<string, Exercise>, week: ProgramWeek, area: BodyArea) =>
    week.sessions.some((planned) =>
      planned.exercises.some((e) => library.get(e.exerciseId)!.highLoadAreas.includes(area)),
    );

  describe.each(PAUSING_FLAGS)('%s', (flag) => {
    it('pauses training until a doctor has seen the person, which a Program cannot go around', async () => {
      const user = await player();

      const reported = await postStopFlag(user, stopFlagOf(flag, TODAY));

      expect(reported.status).toBe(200);
      expect(reported.result).toEqual({
        status: RecordStatus.Saved,
        recorded: true,
        stop: { ...NO_STOP, pausing: [flag] },
      });
      expect(await getStopState(user)).toEqual({ ...NO_STOP, pausing: [flag] });
      const refused = await postProgram(user);
      expect(refused.status).toBe(422);
      expect(refused.result).toEqual({
        status: RecordStatus.Rejected,
        reason: ProgramRejection.Paused,
      });
      expect(await getProgram(user)).toBeNull();
    });

    it('ends when the person confirms a doctor has seen them, and then a Program works', async () => {
      const user = await player();
      await postStopFlag(user, stopFlagOf(flag, TODAY));

      const confirmed = await postConfirm(user);

      expect(confirmed.status).toBe(200);
      expect(confirmed.result).toEqual({ status: RecordStatus.Saved, stop: NO_STOP });
      expect(await getStopState(user)).toEqual(NO_STOP);
      expect((await postProgram(user)).status).toBe(200);
    });

    it('asks the matching Screening questions again', () => {
      expect(stopFlagEffect(flag).recheck.length).toBeGreaterThan(0);
    });
  });

  describe('confirming a doctor has seen the person', () => {
    it('ends two pauses with one confirmation', async () => {
      const user = await player();
      await postStopFlag(user, stopFlagOf(StopFlag.ChestPain, TODAY));
      await postStopFlag(user, stopFlagOf(StopFlag.HeadKnock, TODAY));
      expect((await getStopState(user)).pausing).toEqual([StopFlag.ChestPain, StopFlag.HeadKnock]);

      const confirmed = await postConfirm(user);

      expect(confirmed.result.stop).toEqual(NO_STOP);
      const rows = await rowsOf(user);
      expect(rows).toHaveLength(2);
      expect(rows.every((row) => row.confirmedAt !== null)).toBe(true);
      expect(new Set(rows.map((row) => row.confirmedAt?.getTime())).size).toBe(1);
    });

    it('changes nothing when nothing is open, and leaves a confirmed flag as it was', async () => {
      const user = await player();
      await postConfirm(user);
      expect(await rowsOf(user)).toEqual([]);
      await postStopFlag(user, stopFlagOf(StopFlag.Fainting, TODAY));
      await postConfirm(user);
      const [before] = await rowsOf(user);

      const again = await postConfirm(user);

      expect(again.result.stop).toEqual(NO_STOP);
      expect((await rowsOf(user))[0]!.confirmedAt).toEqual(before!.confirmedAt);
    });

    it('a flag reported after a confirmation pauses again', async () => {
      const user = await player();
      await postStopFlag(user, stopFlagOf(StopFlag.Heartbeat, YESTERDAY));
      await postConfirm(user);

      await postStopFlag(user, stopFlagOf(StopFlag.Heartbeat, TODAY));

      expect((await getStopState(user)).pausing).toEqual([StopFlag.Heartbeat]);
    });

    it('leaves a fever and an excluded area as they are', async () => {
      const user = await player();
      await postStopFlag(user, stopFlagOf(StopFlag.Fever, TODAY));
      await postStopFlag(user, stopFlagOf(StopFlag.NewPain, TODAY));
      await postStopFlag(user, stopFlagOf(StopFlag.ChestPain, TODAY));

      const confirmed = await postConfirm(user);

      expect(confirmed.result.stop).toEqual({
        pausing: [],
        restOn: TODAY,
        excludedAreas: [BodyArea.Knee],
      });
      const open = (await rowsOf(user)).filter((row) => row.confirmedAt === null);
      expect(open.map((row) => row.flag).sort()).toEqual([StopFlag.Fever, StopFlag.NewPain].sort());
    });

    it('answers 401 without a token', async () => {
      const user = await player();

      const response = await user.call(
        HttpMethod.Post,
        stopFlagPath(StopFlagSubpath.Confirm),
        undefined,
        false,
      );

      expect(response.status).toBe(401);
    });
  });

  describe('fever', () => {
    it('makes that day a rest day, with no pause and no refusal of a Program', async () => {
      const user = await player();

      const reported = await postStopFlag(user, stopFlagOf(StopFlag.Fever, TODAY));

      expect(reported.result.stop).toEqual({ ...NO_STOP, restOn: TODAY });
      expect(await getStopState(user)).toEqual({ ...NO_STOP, restOn: TODAY });
      expect((await postProgram(user)).status).toBe(200);
    });

    it('keeps the latest fever day, whatever order they arrive in', async () => {
      const user = await player();
      await postStopFlag(user, stopFlagOf(StopFlag.Fever, TODAY));

      const older = await postStopFlag(user, stopFlagOf(StopFlag.Fever, YESTERDAY));

      expect(older.result.stop.restOn).toBe(TODAY);
    });
  });

  describe('new pain', () => {
    it('needs a body area, and only new pain takes one', async () => {
      const user = await player();
      const bad = [
        { id: crypto.randomUUID(), flag: StopFlag.NewPain, date: TODAY },
        { id: crypto.randomUUID(), flag: StopFlag.NewPain, date: TODAY, bodyArea: 'elbows' },
        { id: crypto.randomUUID(), flag: StopFlag.Fever, date: TODAY, bodyArea: BodyArea.Knee },
      ];

      for (const body of bad) {
        const response = await user.call(HttpMethod.Post, stopFlagPath(), body);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
      }
      expect(await rowsOf(user)).toEqual([]);
    });

    it('leaves the area out, and does not pause or refuse a Program', async () => {
      const user = await player();

      const reported = await postStopFlag(
        user,
        stopFlagOf(StopFlag.NewPain, TODAY, { bodyArea: BodyArea.Neck }),
      );
      await postStopFlag(user, stopFlagOf(StopFlag.NewPain, TODAY, { bodyArea: BodyArea.Wrist }));

      expect(reported.result.stop).toEqual({ ...NO_STOP, excludedAreas: [BodyArea.Neck] });
      expect(await getStopState(user)).toEqual({
        ...NO_STOP,
        excludedAreas: [BodyArea.Neck, BodyArea.Wrist],
      });
      expect((await postProgram(user)).status).toBe(200);
    });

    it('keeps the exercises that load the area out of a newly generated Program', async () => {
      const everyone = await easyPlayer();
      const user = await easyPlayer();
      await postStopFlag(user, stopFlagOf(StopFlag.NewPain, TODAY, { bodyArea: BodyArea.Neck }));
      const library = await libraryById(user);
      // Without the flag the same week does include such an exercise, so the check is real.
      expect(loadsArea(library, await generate(everyone), BodyArea.Neck)).toBe(true);

      const week = await generate(user);

      expect(loadsArea(library, week, BodyArea.Neck)).toBe(false);
    });

    it('adds to the areas Screening already excluded', async () => {
      const user = await easyPlayer({ excludedAreas: [BodyArea.Knee] });
      await postStopFlag(user, stopFlagOf(StopFlag.NewPain, TODAY, { bodyArea: BodyArea.Neck }));
      const library = await libraryById(user);

      const week = await generate(user);

      expect(loadsArea(library, week, BodyArea.Neck)).toBe(false);
      expect(loadsArea(library, week, BodyArea.Knee)).toBe(false);
    });
  });

  describe('a Program that already exists', () => {
    it('is not changed or taken away by a flag reported afterwards', async () => {
      const user = await player();
      const week = await generate(user);

      await postStopFlag(user, stopFlagOf(StopFlag.Fainting, TODAY));

      // The stored Program is returned as it is: a pause stops a new one, not the one the person has.
      expect(await getProgram(user)).toEqual(week);
      expect(await postProgram(user)).toMatchObject({
        status: 200,
        result: { status: RecordStatus.Saved, program: week },
      });
    });
  });

  describe('a referred person', () => {
    it('is told they are referred before they are told training is paused', async () => {
      const user = await player({ yes: [ScreeningQuestion.HeartCondition] });
      await postStopFlag(user, stopFlagOf(StopFlag.ChestPain, TODAY));

      const refused = await postProgram(user);

      expect(refused.result).toEqual({
        status: RecordStatus.Rejected,
        reason: ProgramRejection.Referred,
      });
    });
  });

  describe('reporting', () => {
    it('ignores a replay of an id, changing nothing, and never re-opens a confirmed pause', async () => {
      const user = await player();
      const entry = stopFlagOf(StopFlag.Breathlessness, TODAY);
      await postStopFlag(user, entry);
      await postConfirm(user);
      const [before] = await rowsOf(user);

      const replay = await postStopFlag(user, {
        ...entry,
        flag: StopFlag.Fever,
        date: '2026-12-01',
      });

      expect(replay.status).toBe(200);
      expect(replay.result).toEqual({ status: RecordStatus.Saved, recorded: false, stop: NO_STOP });
      expect(await rowsOf(user)).toEqual([before]);
    });

    it('accepts a day long past and tomorrow, as a flag reported offline arrives late', async () => {
      const user = await player();

      for (const date of ['2020-01-01', '2026-11-06']) {
        expect((await postStopFlag(user, stopFlagOf(StopFlag.Fever, date))).status).toBe(200);
      }
    });

    it('keeps the Session it was reported from when it is the person’s own, and none otherwise', async () => {
      const user = await player();
      const stranger = await player();
      const own = (await generate(user)).sessions[0]!.id;
      const theirs = (await generate(stranger)).sessions[0]!.id;
      const reports = [
        stopFlagOf(StopFlag.Fever, TODAY, { sessionId: own }),
        stopFlagOf(StopFlag.Fever, TODAY, { sessionId: theirs }),
        stopFlagOf(StopFlag.Fever, TODAY, { sessionId: crypto.randomUUID() }),
        stopFlagOf(StopFlag.Fever, TODAY),
      ];

      for (const report of reports) {
        expect((await postStopFlag(user, report)).status).toBe(200);
      }

      const rows = await rowsOf(user);
      const sessionOf = (id: string) => rows.find((row) => row.id === id)!.sessionId;
      expect(reports.map(({ id }) => sessionOf(id))).toEqual([own, null, null, null]);
    });

    it('answers 400 for a body that is not a valid stop flag, and stores nothing', async () => {
      const user = await player();
      const good = stopFlagOf(StopFlag.Fever, TODAY);
      const bad: unknown[] = [
        undefined,
        {},
        { ...good, id: 'x' },
        { ...good, flag: 'sprain' },
        { ...good, date: '05/11/2026' },
        { ...good, sessionId: 'x' },
      ];

      for (const body of bad) {
        const response = await user.call(HttpMethod.Post, stopFlagPath(), body);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
      }
      expect(await rowsOf(user)).toEqual([]);
    });

    it('answers 401 without a token', async () => {
      const user = await player();

      const response = await user.call(
        HttpMethod.Post,
        stopFlagPath(),
        stopFlagOf(StopFlag.Fever, TODAY),
        false,
      );

      expect(response.status).toBe(401);
    });
  });

  describe('privacy', () => {
    it('answers 409 and changes nothing when the id is another user’s stop flag', async () => {
      const user = await player();
      const stranger = await player();
      const theirs = stopFlagOf(StopFlag.Fever, TODAY);
      await postStopFlag(stranger, theirs);

      const response = await user.call(HttpMethod.Post, stopFlagPath(), theirs);

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: ApiErrorCode.IdTaken });
      expect(await rowsOf(user)).toEqual([]);
    });

    it('never shows or ends another user’s pause', async () => {
      const user = await player();
      const stranger = await player();
      await postStopFlag(stranger, stopFlagOf(StopFlag.ChestPain, TODAY));

      await postConfirm(user);

      expect(await getStopState(user)).toEqual(NO_STOP);
      expect((await getStopState(stranger)).pausing).toEqual([StopFlag.ChestPain]);
    });

    it('is append-only for the app role, except stamping confirmed_at once on its own rows', async () => {
      const user = await player();
      const stranger = await player();
      const entry = stopFlagOf(StopFlag.HeadKnock, TODAY);
      await postStopFlag(user, entry);
      const mine = (tx: UserTx) =>
        tx.update(stopFlag).set({ confirmedAt: new Date() }).where(eq(stopFlag.id, entry.id));

      await expect(
        withUser(api.db, stranger.userId, (tx) =>
          tx.insert(stopFlag).values({
            id: crypto.randomUUID(),
            userId: user.userId,
            flag: StopFlag.Fever,
            date: TODAY,
          }),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      for (const change of [
        (tx: UserTx) => tx.delete(stopFlag).where(eq(stopFlag.id, entry.id)),
        (tx: UserTx) =>
          tx.update(stopFlag).set({ flag: StopFlag.Fever }).where(eq(stopFlag.id, entry.id)),
        (tx: UserTx) =>
          tx.update(stopFlag).set({ date: '2020-01-01' }).where(eq(stopFlag.id, entry.id)),
      ]) {
        await expect(withUser(api.db, user.userId, change)).rejects.toMatchObject({
          cause: { code: PG_INSUFFICIENT_PRIVILEGE },
        });
      }
      // Another user's row cannot be stamped, and an open row cannot be "stamped" back to null.
      expect(await withUser(api.db, stranger.userId, (tx) => mine(tx).returning())).toEqual([]);
      await expect(
        withUser(api.db, user.userId, (tx) =>
          tx.update(stopFlag).set({ confirmedAt: null }).where(eq(stopFlag.id, entry.id)),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      expect((await rowsOf(user))[0]!.confirmedAt).toBeNull();

      expect(await withUser(api.db, user.userId, (tx) => mine(tx).returning())).toHaveLength(1);
      const [stamped] = await rowsOf(user);
      expect(stamped!.confirmedAt).not.toBeNull();

      // Once: a second stamp finds no open row.
      expect(await withUser(api.db, user.userId, (tx) => mine(tx).returning())).toEqual([]);
      expect((await rowsOf(user))[0]!.confirmedAt).toEqual(stamped!.confirmedAt);
    });

    it('is part of the export oldest first, and goes with the account', async () => {
      const user = await player();
      const sessionId = (await generate(user)).sessions[0]!.id;
      const first = stopFlagOf(StopFlag.NewPain, TODAY, { sessionId });
      const second = stopFlagOf(StopFlag.ChestPain, TODAY);
      await postStopFlag(user, first);
      await postStopFlag(user, second);
      await postConfirm(user);

      const exported = userExportSchema.parse(
        await (await user.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );

      expect(exported.stopFlags).toEqual([
        {
          id: first.id,
          flag: StopFlag.NewPain,
          date: TODAY,
          area: BodyArea.Knee,
          sessionId,
          reportedAt: expect.any(String),
          confirmedAt: null,
        },
        {
          id: second.id,
          flag: StopFlag.ChestPain,
          date: TODAY,
          area: null,
          sessionId: null,
          reportedAt: expect.any(String),
          confirmedAt: expect.any(String),
        },
      ]);

      expect((await user.call(HttpMethod.Delete, ApiPath.Me)).status).toBe(204);
      expect(await rowsOf(user)).toEqual([]);
    });

    it('never reaches the AI provider: a prompt carries no flag and no Check-in', async () => {
      const user = await easyPlayer();
      await postStopFlag(user, stopFlagOf(StopFlag.Fever, TODAY));
      await postStopFlag(user, stopFlagOf(StopFlag.NewPain, TODAY, { bodyArea: BodyArea.Neck }));
      await postCheckin(user, checkinOf(TODAY, { soreness: 5 }));
      const before = api.ai.calls.length;

      await generate(user);

      const prompts = api.ai.calls.slice(before).map((request) => request.prompt.toLowerCase());
      expect(prompts.length).toBeGreaterThan(0);
      for (const prompt of prompts) {
        for (const secret of [...Object.values(StopFlag), 'stop flag', 'check-in', 'soreness']) {
          expect(prompt).not.toContain(secret);
        }
      }
    });
  });

  describe('asking the Screening questions again', () => {
    it('refers the person when a heart question is now yes, and then no Program is made', async () => {
      const user = await player();
      await postStopFlag(user, stopFlagOf(StopFlag.Heartbeat, TODAY));

      const { status, result } = await postRecheck(user, {
        answers: { [ScreeningQuestion.HeartCondition]: true },
      });

      expect(status).toBe(200);
      expect(result).toMatchObject({
        status: RecordStatus.Saved,
        screening: { status: ScreeningStatus.Referred, trainingMode: TrainingMode.Referred },
      });
      await postConfirm(user);
      expect(await postProgram(user)).toMatchObject({
        status: 422,
        result: { reason: ProgramRejection.Referred },
      });
    });

    it('carries the other answers, the body areas and the starting level over', async () => {
      const user = await player({
        yes: [ScreeningQuestion.EatingDisorder],
        excludedAreas: [BodyArea.Knee, BodyArea.Hip],
      });
      const exportOf = async () =>
        userExportSchema.parse(await (await user.call(HttpMethod.Get, ApiPath.MeExport)).json())
          .screenings;
      const [original] = await exportOf();

      const { result } = await postRecheck(user, {
        answers: { [ScreeningQuestion.HeadInjury]: true },
      });

      const screenings = await exportOf();
      expect(screenings).toHaveLength(2);
      expect(screenings[1]!.answers).toEqual({
        ...original!.answers,
        [ScreeningQuestion.HeadInjury]: true,
      });
      expect(screenings[1]).toMatchObject({
        excludedAreas: [BodyArea.Knee, BodyArea.Hip],
        nutritionOff: true,
        startingLevel: StartingLevel.Beginner,
      });
      expect(result).toMatchObject({ status: RecordStatus.Saved });
    });

    it('updates the excluded areas when the bone, joint and muscle question is answered again', async () => {
      const user = await player({ excludedAreas: [BodyArea.Knee] });

      const { result } = await postRecheck(user, {
        answers: { [ScreeningQuestion.BoneJointMuscle]: true },
        bodyAreas: [BodyArea.Shoulder],
      });

      expect(result).toMatchObject({
        status: RecordStatus.Saved,
        screening: { excludedAreas: [BodyArea.Shoulder] },
      });
    });

    it('clears the excluded areas when that question is now no', async () => {
      const user = await player({ excludedAreas: [BodyArea.Knee] });

      const { result } = await postRecheck(user, {
        answers: { [ScreeningQuestion.BoneJointMuscle]: false },
      });

      expect(result).toMatchObject({ screening: { excludedAreas: [] } });
    });

    it('does not carry a doctor’s go-ahead over to the new Screening', async () => {
      const user = await player({ yes: [ScreeningQuestion.HeartCondition], doctorOk: true });

      const { result } = await postRecheck(user, {
        answers: { [ScreeningQuestion.Fainting]: false },
      });

      expect(result).toMatchObject({
        screening: {
          status: ScreeningStatus.Referred,
          trainingMode: TrainingMode.Referred,
          doctorOkAt: null,
        },
      });
    });

    it('answers 422 when there is no earlier Screening, and stores nothing', async () => {
      const user = await player({ skip: 'screening' });

      const { status, result } = await postRecheck(user, {
        answers: { [ScreeningQuestion.Fainting]: true },
      });

      expect(status).toBe(422);
      expect(result).toEqual({
        status: RecordStatus.Rejected,
        reason: ScreeningRejection.NoScreening,
      });
    });

    it('answers 422 without consent or a profile, as a Screening does', async () => {
      const unconsented = await player({ skip: 'consent' });
      const unprofiled = await player({ skip: 'profile' });
      const recheck = { answers: { [ScreeningQuestion.Fainting]: true } };

      expect(await postRecheck(unconsented, recheck)).toMatchObject({
        status: 422,
        result: { reason: ScreeningRejection.ConsentMissing },
      });
      expect(await postRecheck(unprofiled, recheck)).toMatchObject({
        status: 422,
        result: { reason: ScreeningRejection.ProfileMissing },
      });
    });

    it('answers 400 for a body that is not a valid re-check', async () => {
      const user = await player();
      const bad: unknown[] = [
        undefined,
        {},
        { answers: {} },
        { answers: { fainting: 'yes' } },
        { answers: { 'not-a-question': true } },
        { answers: { [ScreeningQuestion.Fainting]: true }, bodyAreas: [BodyArea.Knee] },
        { answers: { [ScreeningQuestion.BoneJointMuscle]: true } },
        { answers: { [ScreeningQuestion.BoneJointMuscle]: true }, bodyAreas: [] },
        { answers: { [ScreeningQuestion.BoneJointMuscle]: false }, bodyAreas: [BodyArea.Knee] },
      ];

      for (const body of bad) {
        const response = await user.call(HttpMethod.Post, ApiPath.ScreeningRecheck, body);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
      }
    });

    it('answers 401 without a token', async () => {
      const user = await player();

      const response = await user.call(
        HttpMethod.Post,
        ApiPath.ScreeningRecheck,
        { answers: { [ScreeningQuestion.Fainting]: true } },
        false,
      );

      expect(response.status).toBe(401);
    });
  });
});
