import {
  ApiPath,
  HttpMethod,
  ProgramRejection,
  RecordStatus,
  userExportSchema,
  type Exercise,
  type ProgramWeek,
} from '@stamina/contracts';
import {
  BodyArea,
  DEFAULT_EQUIPMENT,
  Emphasis,
  generateWeek,
  Goal,
  Intensity,
  LaunchSport,
  LoadGuidance,
  MovementPattern,
  PrescriptionUnit,
  RULES_VERSION,
  ScreeningQuestion,
  SeasonKind,
  SessionFocus,
  SessionSlot,
  TrainingMode,
  Weekday,
} from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appUser, block, program, session, sessionExercise } from '../src/db/schema.ts';
import { withUser } from '../src/db/with-user.ts';
import { EXERCISE_DATA_DIR, loadExerciseLibrary } from '../src/exercises/node.ts';
import { FIXTURE_LIBRARY_DIR } from './support/exercise-library-dir.ts';
import {
  ALL_DAYS,
  PROGRAM_NOW,
  PROGRAM_STARTS_ON,
  PROGRAM_WEEK,
  approveSport,
  basketballPersona,
  getProgram,
  kitesurferPersona,
  libraryById,
  padelPersona,
  postProgram,
  programUser,
} from './support/program-fixtures.ts';
import {
  PG_INSUFFICIENT_PRIVILEGE,
  type FixtureUser,
  type TestApi,
} from './support/safety-fixtures.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import { startTestApi } from './support/test-api.ts';

/** Exercises per slot at 30, 45 and 60 minutes: warm-up, main, sport support, accessories, cool-down. */
const EXPECTED_COUNTS: Record<number, Record<SessionSlot, number>> = {
  30: {
    [SessionSlot.WarmUp]: 2,
    [SessionSlot.MainStrength]: 2,
    [SessionSlot.SportSupport]: 1,
    [SessionSlot.AccessoriesCore]: 1,
    [SessionSlot.CoolDown]: 1,
  },
  45: {
    [SessionSlot.WarmUp]: 2,
    [SessionSlot.MainStrength]: 2,
    [SessionSlot.SportSupport]: 2,
    [SessionSlot.AccessoriesCore]: 2,
    [SessionSlot.CoolDown]: 1,
  },
  60: {
    [SessionSlot.WarmUp]: 3,
    [SessionSlot.MainStrength]: 3,
    [SessionSlot.SportSupport]: 2,
    [SessionSlot.AccessoriesCore]: 3,
    [SessionSlot.CoolDown]: 2,
  },
};
const LOWER_PATTERNS = [MovementPattern.Squat, MovementPattern.Hinge, MovementPattern.Lunge];
const UPPER_PATTERNS = [MovementPattern.Push, MovementPattern.Pull, MovementPattern.Overhead];
const POWER_PATTERNS = [MovementPattern.JumpLand, MovementPattern.ChangeOfDirection];
const HOURS_PER_DAY = 24;

const countBySlot = (planned: ProgramWeek['sessions'][number]) =>
  Object.fromEntries(
    Object.values(SessionSlot).map((slot) => [
      slot,
      planned.exercises.filter((exercise) => exercise.slot === slot).length,
    ]),
  );
const dayIndex = (date: string) => PROGRAM_WEEK.findIndex((day) => day.date === date);
const withoutIds = (week: ProgramWeek) => ({
  ...week,
  sessions: week.sessions.map((planned) => ({ ...planned, id: '' })),
});

describe('program generation', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;

  beforeAll(async () => {
    // The real exercise library, so the test also proves it can fill every slot.
    scratch = await createScratchDatabase(EXERCISE_DATA_DIR);
    api = await startTestApi({ databaseUrl: scratch.url, now: () => PROGRAM_NOW });
    await approveSport(api, LaunchSport.Padel, (profile) => ({
      ...profile,
      recoveryWindowHours: { lower: 48, upper: 24 },
    }));
    await approveSport(api, LaunchSport.Basketball);
    await approveSport(api, LaunchSport.Kitesurfing, (profile) => ({
      ...profile,
      season: { kind: SeasonKind.Weather, months: [4, 5, 6, 7, 8, 9, 10] },
    }));
  });
  afterAll(async () => {
    await api.close();
    await scratch.drop();
  });

  const generate = async (user: FixtureUser): Promise<ProgramWeek> => {
    const { status, result } = await postProgram(user);
    expect(status).toBe(200);
    if (result.status !== RecordStatus.Saved) throw new Error('expected a Program');
    return result.program;
  };

  describe('the padel player (Tuesday and Friday, hard)', () => {
    let user: FixtureUser;
    let week: ProgramWeek;
    let library: Map<string, Exercise>;

    beforeAll(async () => {
      user = await programUser(api, { submission: padelPersona() });
      week = await generate(user);
      library = await libraryById(user);
    });

    it('starts the day after generation and names the Block', () => {
      expect(week.block).toEqual({
        emphasis: Emphasis.PowerSpeed,
        startsOn: PROGRAM_STARTS_ON,
        weekInBlock: 1,
        limited: false,
        beta: false,
      });
    });

    it('plans three Sessions on days that are not Tuesday or Friday', () => {
      expect(week.sessions).toHaveLength(3);
      for (const planned of week.sessions) {
        expect([Weekday.Tue, Weekday.Fri]).not.toContain(planned.weekday);
        expect(planned.weekday).toBe(PROGRAM_WEEK[dayIndex(planned.date)]!.weekday);
      }
    });

    it('keeps heavy Sessions out of their recovery window before a hard day', () => {
      // Windows were set to 48 hours (lower) and 24 hours (upper) for padel in `beforeAll`.
      const hard = PROGRAM_WEEK.filter((day) => [Weekday.Tue, Weekday.Fri].includes(day.weekday));
      for (const planned of week.sessions) {
        const next = hard.map((day) => dayIndex(day.date)).find((i) => i > dayIndex(planned.date));
        if (next === undefined) continue;
        const hours = (next - dayIndex(planned.date)) * HOURS_PER_DAY;
        expect(hours).toBeGreaterThan(planned.focus === SessionFocus.Lower ? 48 : 24);
      }
    });

    it('leaves at least one day with no Session and no hard Activity', () => {
      const busy = new Set([
        ...week.sessions.map((planned) => planned.weekday),
        Weekday.Tue,
        Weekday.Fri,
      ]);
      expect(ALL_DAYS.some((day) => !busy.has(day))).toBe(true);
    });

    it('gives every Session one focus with that half of the body in main strength', () => {
      expect(week.sessions.map((planned) => planned.focus)).toEqual([
        SessionFocus.Lower,
        SessionFocus.Upper,
        SessionFocus.Lower,
      ]);
      for (const planned of week.sessions) {
        const patterns = planned.exercises
          .filter((exercise) => exercise.slot === SessionSlot.MainStrength)
          .map((exercise) => library.get(exercise.exerciseId)!.movementPattern);
        const allowed = planned.focus === SessionFocus.Lower ? LOWER_PATTERNS : UPPER_PATTERNS;
        for (const pattern of patterns) expect(allowed).toContain(pattern);
        expect(new Set(patterns).size).toBe(patterns.length);
      }
    });

    it('fills every slot of the 45-minute structure, in slot order, with no repeats in a Session', () => {
      for (const planned of week.sessions) {
        expect(planned.minutes).toBe(45);
        expect(countBySlot(planned)).toEqual(EXPECTED_COUNTS[45]);
        const slots = planned.exercises.map((exercise) => exercise.slot);
        expect(slots).toEqual(
          Object.values(SessionSlot).flatMap((slot) =>
            Array(EXPECTED_COUNTS[45]![slot]).fill(slot),
          ),
        );
        const ids = planned.exercises.map((exercise) => exercise.exerciseId);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });

    it('prescribes power and speed work at 3 reps in reserve or more, with no kilograms', () => {
      for (const planned of week.sessions) {
        for (const exercise of planned.exercises) {
          const equipment = library.get(exercise.exerciseId)!.equipment;
          if (exercise.slot === SessionSlot.WarmUp || exercise.slot === SessionSlot.CoolDown) {
            expect(exercise.rir).toBeNull();
            expect(exercise.loadGuidance).toBe(LoadGuidance.None);
          } else if (exercise.rir !== null) {
            expect(exercise.rir).toBeGreaterThanOrEqual(3);
            expect(exercise.loadGuidance).toBe(
              equipment.length === 0 ? LoadGuidance.Bodyweight : LoadGuidance.RpeGuided,
            );
          }
          if (exercise.slot === SessionSlot.CoolDown) {
            expect(exercise.unit).toBe(PrescriptionUnit.Seconds);
            expect([exercise.sets, exercise.repMin, exercise.repMax]).toEqual([1, 30, 45]);
          }
          if (exercise.slot === SessionSlot.MainStrength) {
            expect([exercise.sets, exercise.repMin, exercise.repMax]).toEqual([4, 3, 5]);
          }
        }
      }
    });

    it('does not repeat an exercise across Sessions while others remain', () => {
      const ids = week.sessions.flatMap((planned) =>
        planned.exercises.map((exercise) => exercise.exerciseId),
      );
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('plans only exercises that need no more than bodyweight and dumbbells', () => {
      for (const planned of week.sessions) {
        for (const exercise of planned.exercises) {
          for (const item of library.get(exercise.exerciseId)!.equipment) {
            expect(item).toBe('dumbbell');
          }
        }
      }
    });

    it('answers a repeat POST and a GET with the same stored week', async () => {
      const again = await postProgram(user);
      expect(again.status).toBe(200);
      expect(again.result).toEqual({ status: RecordStatus.Saved, program: week });
      expect(await getProgram(user)).toEqual(week);
    });

    it('stores the reproducibility record and no AI fields', async () => {
      const rows = await api.db.select().from(session).where(eq(session.userId, user.userId));
      expect(rows).toHaveLength(3);
      for (const row of rows) {
        expect(row.revision).toBe(1);
        expect(row.supersedesId).toBeNull();
        expect(row.rulesVersion).toBe(RULES_VERSION);
        expect(row.model).toBeNull();
        expect(row.promptVersion).toBeNull();
        expect(row.inputsHash).toMatch(/^[0-9a-f]{64}$/);
      }
      expect(week.sessions.every((planned) => planned.rulesVersion === RULES_VERSION)).toBe(true);
      const programs = await api.db.select().from(program).where(eq(program.userId, user.userId));
      expect(programs).toHaveLength(1);
    });
  });

  describe('placement fallbacks', () => {
    it('turns the Session that cannot go before a hard day into a Recovery Session', async () => {
      // Saturday and Wednesday are clear of Tuesday and Friday; Monday is the day before Tuesday.
      const user = await programUser(api, {
        submission: {
          ...padelPersona(),
          trainingWeek: {
            sessionsPerWeek: 3,
            sessionMinutes: 45,
            availableDays: [Weekday.Sat, Weekday.Mon, Weekday.Wed],
          },
        },
      });
      const week = await generate(user);
      expect(week.sessions.map((planned) => [planned.weekday, planned.focus])).toEqual([
        [Weekday.Sat, SessionFocus.Lower],
        [Weekday.Mon, SessionFocus.Recovery],
        [Weekday.Wed, SessionFocus.Upper],
      ]);
      const recovery = week.sessions[1]!;
      const library = await libraryById(user);
      expect(countBySlot(recovery)).toEqual({
        ...EXPECTED_COUNTS[45],
        [SessionSlot.MainStrength]: 0,
        [SessionSlot.SportSupport]: 0,
      });
      for (const exercise of recovery.exercises.filter(
        (e) => e.slot === SessionSlot.AccessoriesCore,
      )) {
        expect([MovementPattern.Core, MovementPattern.Mobility]).toContain(
          library.get(exercise.exerciseId)!.movementPattern,
        );
      }
    });

    it('puts Recovery Sessions on a hard day when there are too few other days', async () => {
      const user = await programUser(api, {
        submission: {
          ...padelPersona(),
          trainingWeek: {
            sessionsPerWeek: 2,
            sessionMinutes: 45,
            availableDays: [Weekday.Mon, Weekday.Tue],
          },
        },
      });
      const week = await generate(user);
      expect(week.sessions.map((planned) => [planned.weekday, planned.focus])).toEqual([
        [Weekday.Mon, SessionFocus.Recovery],
        [Weekday.Tue, SessionFocus.Recovery],
      ]);
    });
  });

  describe('the basketball player (two games, 30-minute Sessions)', () => {
    it('merges nothing away: every slot is present at 30 minutes with its count', async () => {
      const user = await programUser(api, { submission: basketballPersona });
      const week = await generate(user);
      expect(week.sessions).toHaveLength(2);
      expect(week.sessions.map((planned) => planned.focus)).toEqual([
        SessionFocus.Lower,
        SessionFocus.Upper,
      ]);
      for (const planned of week.sessions) {
        expect(planned.minutes).toBe(30);
        expect(countBySlot(planned)).toEqual(EXPECTED_COUNTS[30]);
        expect([Weekday.Wed, Weekday.Sat]).not.toContain(planned.weekday);
      }
    });
  });

  describe('the kitesurfer (days vary, out of season)', () => {
    it('builds Strength out of season, plans four 60-minute Sessions on any day', async () => {
      const user = await programUser(api, { submission: kitesurferPersona });
      const week = await generate(user);
      expect(week.block.emphasis).toBe(Emphasis.Strength);
      expect(week.sessions).toHaveLength(4);
      expect(week.sessions.map((planned) => planned.focus)).toEqual([
        SessionFocus.Lower,
        SessionFocus.Upper,
        SessionFocus.Lower,
        SessionFocus.Upper,
      ]);
      for (const planned of week.sessions) {
        expect(planned.minutes).toBe(60);
        expect(countBySlot(planned)).toEqual(EXPECTED_COUNTS[60]);
      }
      const dates = week.sessions.map((planned) => dayIndex(planned.date));
      expect(new Set(dates).size).toBe(4);
      // Four Sessions in seven days: the smallest gap is as large as it can be (two days).
      expect(Math.min(...dates.slice(1).map((index, i) => index - dates[i]!))).toBe(2);
    });
  });

  describe('a Limited user (a doctor has said they can train)', () => {
    it('never plans power work, a Power and speed Block or work closer than RPE 7', async () => {
      const user = await programUser(api, {
        submission: padelPersona(60),
        yes: [ScreeningQuestion.HeartCondition],
        doctorOk: true,
      });
      const week = await generate(user);
      const library = await libraryById(user);
      expect(week.block.limited).toBe(true);
      expect(week.block.emphasis).toBe(Emphasis.Strength);
      for (const planned of week.sessions) {
        expect(countBySlot(planned)).toEqual(EXPECTED_COUNTS[60]);
        for (const exercise of planned.exercises) {
          expect(POWER_PATTERNS).not.toContain(library.get(exercise.exerciseId)!.movementPattern);
          if (exercise.rir !== null) expect(exercise.rir).toBeGreaterThanOrEqual(3);
        }
      }
    });
  });

  describe('a user with an excluded area', () => {
    const loadsArea = (library: Map<string, Exercise>, week: ProgramWeek, area: BodyArea) =>
      week.sessions.some((planned) =>
        planned.exercises.some((e) => library.get(e.exerciseId)!.highLoadAreas.includes(area)),
      );
    const isRecoveryShaped = (planned: ProgramWeek['sessions'][number]) =>
      planned.exercises.every((e) =>
        [SessionSlot.WarmUp, SessionSlot.AccessoriesCore, SessionSlot.CoolDown].includes(e.slot),
      ) &&
      planned.exercises.some((e) => e.slot === SessionSlot.AccessoriesCore) &&
      planned.exercises.some((e) => e.slot === SessionSlot.WarmUp) &&
      planned.exercises.some((e) => e.slot === SessionSlot.CoolDown);

    it('never plans an exercise that loads it (neck)', async () => {
      const everyone = await programUser(api, { submission: padelPersona(60) });
      const user = await programUser(api, {
        submission: padelPersona(60),
        excludedAreas: [BodyArea.Neck],
      });
      const library = await libraryById(user);
      // Without the exclusion the same week does include such an exercise, so the check is real.
      expect(loadsArea(library, await generate(everyone), BodyArea.Neck)).toBe(true);

      const week = await generate(user);
      for (const planned of week.sessions)
        expect(countBySlot(planned)).toEqual(EXPECTED_COUNTS[60]);
      expect(loadsArea(library, week, BodyArea.Neck)).toBe(false);
    });

    // The beta library tags every lower-body exercise with the knee, hip and lower back, so a
    // heavy focus it cannot fill becomes a Recovery Session: the Session count never drops.
    // At 30 minutes (one sport-support slot) upper Sessions are still fillable without the knee;
    // at 45 and 60 the library has too few non-jumping sport-support exercises, so they convert too.
    it('turns the lower Sessions into Recovery Sessions when the knee is excluded', async () => {
      const user = await programUser(api, {
        submission: padelPersona(30),
        excludedAreas: [BodyArea.Knee],
      });
      const library = await libraryById(user);
      const week = await generate(user);

      expect(week.sessions).toHaveLength(3);
      const recovery = week.sessions.filter((planned) => planned.focus === SessionFocus.Recovery);
      const upper = week.sessions.filter((planned) => planned.focus === SessionFocus.Upper);
      expect(week.sessions.some((planned) => planned.focus === SessionFocus.Lower)).toBe(false);
      expect(recovery).toHaveLength(2);
      expect(upper).toHaveLength(1);
      for (const planned of recovery) {
        expect(isRecoveryShaped(planned)).toBe(true);
        expect(countBySlot(planned)).toEqual({
          ...EXPECTED_COUNTS[30],
          [SessionSlot.MainStrength]: 0,
          [SessionSlot.SportSupport]: 0,
        });
      }
      for (const planned of upper) {
        expect(countBySlot(planned)).toEqual(EXPECTED_COUNTS[30]);
        for (const exercise of planned.exercises.filter((e) => e.slot === SessionSlot.MainStrength))
          expect(UPPER_PATTERNS).toContain(library.get(exercise.exerciseId)!.movementPattern);
      }
      expect(loadsArea(library, week, BodyArea.Knee)).toBe(false);
      // The Session dates are still never on a hard Activity day (padel Tuesday and Friday).
      for (const planned of week.sessions) {
        expect([Weekday.Tue, Weekday.Fri]).not.toContain(
          PROGRAM_WEEK[dayIndex(planned.date)]!.weekday,
        );
      }
    });

    it('plans only Recovery Sessions when no heavy focus can be filled (lower back)', async () => {
      const user = await programUser(api, {
        submission: padelPersona(60),
        excludedAreas: [BodyArea.LowerBack],
      });
      const library = await libraryById(user);
      const week = await generate(user);

      expect(week.sessions).toHaveLength(3);
      for (const planned of week.sessions) {
        expect(planned.focus).toBe(SessionFocus.Recovery);
        expect(isRecoveryShaped(planned)).toBe(true);
      }
      expect(loadsArea(library, week, BodyArea.LowerBack)).toBe(false);
    });
  });

  describe('inputs hash and determinism', () => {
    it('is stable across users with identical inputs, and the weeks are identical', async () => {
      const first = await generate(await programUser(api, { submission: padelPersona() }));
      const second = await generate(await programUser(api, { submission: padelPersona() }));
      expect(second.sessions[0]!.inputsHash).toBe(first.sessions[0]!.inputsHash);
      expect(new Set(first.sessions.map((planned) => planned.inputsHash)).size).toBe(1);
      expect(withoutIds(second)).toEqual(withoutIds(first));
    });

    it('changes when an input changes', async () => {
      const base = await generate(await programUser(api, { submission: padelPersona() }));
      const longer = await generate(await programUser(api, { submission: padelPersona(60) }));
      const knee = await generate(
        await programUser(api, {
          submission: padelPersona(),
          excludedAreas: [BodyArea.Neck],
        }),
      );
      const hashes = [base, longer, knee].map((week) => week.sessions[0]!.inputsHash);
      expect(new Set(hashes).size).toBe(3);
    });
  });

  describe('refusals', () => {
    const storedFor = async (user: FixtureUser) =>
      (await api.db.select().from(program).where(eq(program.userId, user.userId))).length;

    it('says not-ready before a profile, without consent and without a Screening', async () => {
      for (const skip of ['profile', 'consent', 'screening'] as const) {
        const user = await programUser(api, { submission: padelPersona(), skip });
        const { status, result } = await postProgram(user);
        expect(status).toBe(422);
        expect(result).toEqual({
          status: RecordStatus.Rejected,
          reason: ProgramRejection.NotReady,
        });
        expect(await getProgram(user)).toBeNull();
        expect(await storedFor(user)).toBe(0);
      }
    });

    it('says referred for a Referred person, even with a training week', async () => {
      const user = await programUser(api, {
        submission: padelPersona(),
        yes: [ScreeningQuestion.ChestPain],
      });
      const { status, result } = await postProgram(user);
      expect(status).toBe(422);
      expect(result).toEqual({ status: RecordStatus.Rejected, reason: ProgramRejection.Referred });
      expect(await storedFor(user)).toBe(0);
    });

    it('says no-training-week for food only', async () => {
      const user = await programUser(api, { foodOnly: true });
      const { status, result } = await postProgram(user);
      expect(status).toBe(422);
      expect(result).toEqual({
        status: RecordStatus.Rejected,
        reason: ProgramRejection.NoTrainingWeek,
      });
      expect(await storedFor(user)).toBe(0);
    });

    it('answers 401 without a token', async () => {
      const user = await programUser(api, { submission: padelPersona(), skip: 'consent' });
      for (const method of [HttpMethod.Get, HttpMethod.Post]) {
        expect((await user.call(method, ApiPath.Program, undefined, false)).status).toBe(401);
      }
    });
  });

  describe('privacy', () => {
    let owner: FixtureUser;
    let week: ProgramWeek;

    beforeAll(async () => {
      owner = await programUser(api, { submission: padelPersona() });
      week = await generate(owner);
    });

    it('shows another user no Program', async () => {
      const other = await programUser(api, { submission: padelPersona(), skip: 'consent' });
      expect(await getProgram(other)).toBeNull();
      const rows = await withUser(api.db, other.userId, async (tx) => ({
        programs: await tx.select().from(program),
        blocks: await tx.select().from(block),
        sessions: await tx.select().from(session),
        exercises: await tx.select().from(sessionExercise),
      }));
      expect(rows).toEqual({ programs: [], blocks: [], sessions: [], exercises: [] });
    });

    it('lets the app role neither write another user’s rows nor change or delete its own', async () => {
      const other = await programUser(api, { submission: padelPersona(), skip: 'consent' });
      const [stolen] = await api.db.select().from(program).where(eq(program.userId, owner.userId));
      await expect(
        withUser(api.db, other.userId, (tx) => tx.insert(program).values({ userId: owner.userId })),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      for (const change of [
        (tx: Parameters<Parameters<typeof withUser>[2]>[0]) =>
          tx.update(session).set({ minutes: 60 }).where(eq(session.id, week.sessions[0]!.id)),
        (tx: Parameters<Parameters<typeof withUser>[2]>[0]) =>
          tx.delete(session).where(eq(session.id, week.sessions[0]!.id)),
        (tx: Parameters<Parameters<typeof withUser>[2]>[0]) =>
          tx.delete(program).where(eq(program.id, stolen!.id)),
      ]) {
        await expect(withUser(api.db, owner.userId, change)).rejects.toMatchObject({
          cause: { code: PG_INSUFFICIENT_PRIVILEGE },
        });
      }
    });

    it('is part of the export, and goes with the account', async () => {
      const exported = userExportSchema.parse(
        await (await owner.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );
      expect(exported.program).toEqual(week);

      expect((await owner.call(HttpMethod.Delete, ApiPath.Me)).status).toBe(204);
      for (const table of [program, block, session, sessionExercise]) {
        expect(await api.db.select().from(table).where(eq(table.userId, owner.userId))).toEqual([]);
      }
      expect(await api.db.select().from(appUser).where(eq(appUser.id, owner.userId))).toEqual([]);
    });
  });
});

describe('program generation with a library too small to fill even a Recovery Session', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;

  beforeAll(async () => {
    scratch = await createScratchDatabase(FIXTURE_LIBRARY_DIR);
    api = await startTestApi({ databaseUrl: scratch.url, now: () => PROGRAM_NOW });
  });
  afterAll(async () => {
    await api.close();
    await scratch.drop();
  });

  it('says no-exercises and stores no half Session', async () => {
    // Every body area excluded leaves the small library unable to fill a Recovery Session.
    const user = await programUser(api, {
      submission: padelPersona(60),
      excludedAreas: Object.values(BodyArea),
    });
    const { status, result } = await postProgram(user);
    expect(status).toBe(422);
    expect(result).toEqual({ status: RecordStatus.Rejected, reason: ProgramRejection.NoExercises });
    expect(await api.db.select().from(session).where(eq(session.userId, user.userId))).toEqual([]);
    expect(await api.db.select().from(program).where(eq(program.userId, user.userId))).toEqual([]);
  });
});

describe('the weeks of a Block (the engine used directly, as only week 1 is generated for now)', () => {
  const week = async (weekInBlock: number, mode: TrainingMode.Full | TrainingMode.Limited) => {
    const library = await loadExerciseLibrary(EXERCISE_DATA_DIR);
    const generated = generateWeek({
      goal: Goal.Strength,
      playDays: [],
      playVaries: true,
      playIntensity: Intensity.Easy,
      trainingWeek: { sessionsPerWeek: 3, sessionMinutes: 60, availableDays: ALL_DAYS },
      sport: null,
      mode,
      excludedAreas: [],
      equipment: DEFAULT_EQUIPMENT,
      library,
      weekInBlock,
      startsOn: PROGRAM_STARTS_ON,
    });
    if (generated === null) throw new Error('expected a week');
    return generated;
  };
  const main = (generated: Awaited<ReturnType<typeof week>>) =>
    generated.sessions
      .flatMap((planned) => planned.exercises)
      .filter((exercise) => exercise.slot === SessionSlot.MainStrength);

  it('steps reps in reserve 3, 2, 1 and then 4 in the Deload, which halves the sets', async () => {
    const rirs = [];
    for (const weekInBlock of [1, 2, 3, 4]) {
      const exercises = main(await week(weekInBlock, TrainingMode.Full));
      rirs.push(new Set(exercises.map((exercise) => exercise.rir)));
      expect(new Set(exercises.map((exercise) => exercise.sets))).toEqual(
        new Set([weekInBlock === 4 ? 2 : 4]),
      );
    }
    expect(rirs).toEqual([new Set([3]), new Set([2]), new Set([1]), new Set([4])]);
  });

  it('keeps Limited mode at 3 reps in reserve or more in every build week', async () => {
    for (const weekInBlock of [1, 2, 3, 4]) {
      const generated = await week(weekInBlock, TrainingMode.Limited);
      for (const exercise of generated.sessions.flatMap((planned) => planned.exercises)) {
        if (exercise.rir !== null) expect(exercise.rir).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
