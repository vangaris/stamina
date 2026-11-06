import {
  ApiPath,
  HttpMethod,
  RecordStatus,
  SessionRejection,
  SessionSubpath,
  sessionPath,
  userExportSchema,
  type SessionDetail,
  type SessionExercise,
} from '@stamina/contracts';
import {
  LaunchSport,
  LoadGuidance,
  MAX_LOGGED_SETS,
  ProgressionOutcome,
  SessionFocus,
  SessionStatus,
} from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appUser, session, sessionLog, setLog } from '../src/db/schema.ts';
import { withUser } from '../src/db/with-user.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { EXERCISE_DATA_DIR } from '../src/exercises/node.ts';
import {
  PROGRAM_NOW,
  approveSport,
  getProgram,
  libraryById,
  padelPersona,
  programUser,
} from './support/program-fixtures.ts';
import {
  PG_INSUFFICIENT_PRIVILEGE,
  type FixtureUser,
  type TestApi,
} from './support/safety-fixtures.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import {
  getSession,
  insertNextSession,
  logSets,
  mainExerciseOf,
  postFinish,
  postSet,
  readSessionOf,
  sessionsOf,
  sessionWithFocus,
  setOf,
} from './support/session-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

const NEXT_WEEK = 7;
/** A weight the progression tests log, in kilograms. */
const LOGGED_KG = 60;

describe('Session screen: logging, finishing, progression', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;

  beforeAll(async () => {
    // The real exercise library: it has the easier and harder variants the Session screen swaps to.
    scratch = await createScratchDatabase(EXERCISE_DATA_DIR);
    api = await startTestApi({ databaseUrl: scratch.url, now: () => PROGRAM_NOW });
    await approveSport(api, LaunchSport.Padel);
  });
  afterAll(async () => {
    await api.close();
    await scratch.drop();
  });

  /** A fresh padel player with a Program: their Lower and Upper Sessions, as the API shows them. */
  const player = async () => {
    const user = await programUser(api, { submission: padelPersona() });
    const { week, details } = await sessionsOf(user);
    return {
      user,
      week,
      details,
      lower: sessionWithFocus(details, SessionFocus.Lower),
      upper: sessionWithFocus(details, SessionFocus.Upper),
    };
  };

  describe('GET /sessions/{id}', () => {
    it('shows the planned Session as the week lists it, with names, variants and nothing logged', async () => {
      const { user, week, details } = await player();
      const library = await libraryById(user);

      for (const planned of week.sessions) {
        const detail = details.find(({ id }) => id === planned.id)!;
        expect(detail).toMatchObject({
          id: planned.id,
          date: planned.date,
          weekday: planned.weekday,
          focus: planned.focus,
          minutes: planned.minutes,
          status: SessionStatus.Planned,
          revision: planned.revision,
          rulesVersion: planned.rulesVersion,
          inputsHash: planned.inputsHash,
          emphasis: week.block.emphasis,
          finished: null,
        });
        expect(
          detail.exercises.map((rest) => ({
            exerciseId: rest.exerciseId,
            slot: rest.slot,
            name: rest.name,
            sets: rest.sets,
            repMin: rest.repMin,
            repMax: rest.repMax,
            unit: rest.unit,
            rir: rest.rir,
            loadGuidance: rest.loadGuidance,
            suggestedByAi: rest.suggestedByAi,
          })),
        ).toEqual(planned.exercises);
        for (const exercise of detail.exercises) {
          const entry = library.get(exercise.exerciseId)!;
          expect(exercise.easier?.exerciseId ?? null).toBe(entry.easierId);
          expect(exercise.harder?.exerciseId ?? null).toBe(entry.harderId);
          if (entry.easierId !== null) {
            expect(exercise.easier?.name).toEqual(library.get(entry.easierId)!.name);
          }
          if (entry.harderId !== null) {
            expect(exercise.harder?.name).toEqual(library.get(entry.harderId)!.name);
          }
          expect(exercise).toMatchObject({
            loggedSets: [],
            suggestedWeightKg: null,
            progression: null,
          });
        }
      }
      expect(details.some(({ exercises }) => exercises.some((e) => e.easier !== null))).toBe(true);
    });

    it('answers 404 for an unknown id, an id that is not a UUID, and another user’s Session', async () => {
      const { user, lower } = await player();
      const stranger = await programUser(api, { submission: padelPersona(), skip: 'consent' });

      expect((await getSession(user, crypto.randomUUID())).status).toBe(404);
      expect((await user.call(HttpMethod.Get, `${ApiPath.Sessions}/not-a-uuid`)).status).toBe(404);
      const response = await stranger.call(HttpMethod.Get, sessionPath(lower.id));
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: ApiErrorCode.NotFound });
    });

    it('answers 401 without a token', async () => {
      const { user, lower } = await player();
      for (const [method, path] of [
        [HttpMethod.Get, sessionPath(lower.id)],
        [HttpMethod.Post, sessionPath(lower.id, SessionSubpath.Sets)],
        [HttpMethod.Post, sessionPath(lower.id, SessionSubpath.Finish)],
      ] as const) {
        expect((await user.call(method, path, undefined, false)).status).toBe(401);
      }
    });
  });

  describe('POST /sessions/{id}/sets', () => {
    it('stores a set and shows it under its exercise in set order', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);
      const second = setOf(main.exerciseId, 2, 62.5, 5, 8);
      const first = setOf(main.exerciseId, 1, 60, 6, 7);

      expect(await postSet(user, lower.id, second)).toEqual({
        status: 200,
        result: { status: RecordStatus.Saved, recorded: true },
      });
      await postSet(user, lower.id, first);

      const shown = (await readSessionOf(user, lower.id)).exercises.find(
        ({ id }) => id === main.id,
      )!;
      expect(shown.loggedSets).toEqual([first, second]);
      const others = (await readSessionOf(user, lower.id)).exercises.filter(
        ({ id }) => id !== main.id,
      );
      expect(others.every(({ loggedSets }) => loggedSets.length === 0)).toBe(true);
    });

    it('ignores a replay of a set id, even with other values', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);
      const set = setOf(main.exerciseId, 1, 60, 5, 7);
      await postSet(user, lower.id, set);

      const replay = await postSet(user, lower.id, { ...set, weightKg: 100, reps: 1, rpe: 10 });

      expect(replay).toEqual({
        status: 200,
        result: { status: RecordStatus.Saved, recorded: false },
      });
      expect(mainExerciseOf(await readSessionOf(user, lower.id)).loggedSets).toEqual([set]);
    });

    it('answers 409 for a set id that belongs to another Session, and stores nothing', async () => {
      const { user, lower, upper } = await player();
      const taken = setOf(mainExerciseOf(lower).exerciseId, 1, 60, 5, 7);
      await postSet(user, lower.id, taken);

      const response = await user.call(
        HttpMethod.Post,
        sessionPath(upper.id, SessionSubpath.Sets),
        {
          ...taken,
          exerciseId: mainExerciseOf(upper).exerciseId,
        },
      );

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: ApiErrorCode.IdTaken });
      expect(mainExerciseOf(await readSessionOf(user, upper.id)).loggedSets).toEqual([]);
    });

    it('ignores a second set with the same number under another id', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);
      const first = setOf(main.exerciseId, 1, 60, 5, 7);
      await postSet(user, lower.id, first);

      const again = await postSet(user, lower.id, setOf(main.exerciseId, 1, 70, 5, 9));

      expect(again.result).toEqual({ status: RecordStatus.Saved, recorded: false });
      expect(mainExerciseOf(await readSessionOf(user, lower.id)).loggedSets).toEqual([first]);
    });

    it('accepts the tagged easier or harder variant, shown under the planned exercise', async () => {
      const { user, details } = await player();
      const swapped = details
        .flatMap((detail) => detail.exercises.map((exercise) => ({ detail, exercise })))
        .find(({ exercise }) => exercise.easier !== null && exercise.harder !== null)!;
      const { detail, exercise } = swapped;
      const easier = setOf(exercise.easier!.exerciseId, 1, 40, 8, 7);
      const harder = setOf(exercise.harder!.exerciseId, 2, 80, 4, 9);

      expect((await postSet(user, detail.id, easier)).result).toEqual({
        status: RecordStatus.Saved,
        recorded: true,
      });
      expect((await postSet(user, detail.id, harder)).result).toEqual({
        status: RecordStatus.Saved,
        recorded: true,
      });

      const shown = (await readSessionOf(user, detail.id)).exercises.find(
        ({ id }) => id === exercise.id,
      )!;
      expect(shown.exerciseId).toBe(exercise.exerciseId);
      expect(shown.loggedSets).toEqual([easier, harder]);
    });

    it('rejects an exercise that is neither planned nor a variant, and stores nothing', async () => {
      const { user, lower } = await player();
      const library = await libraryById(user);
      const allowed = new Set(
        lower.exercises.flatMap((e) => [e.exerciseId, e.easier?.exerciseId, e.harder?.exerciseId]),
      );
      const foreign = [...library.keys()].find((id) => !allowed.has(id))!;

      const rejected = await postSet(user, lower.id, setOf(foreign, 1, 20, 8, 7));
      const unknown = await postSet(user, lower.id, setOf('no-such-exercise', 1, 20, 8, 7));

      for (const attempt of [rejected, unknown]) {
        expect(attempt).toEqual({
          status: 422,
          result: { status: RecordStatus.Rejected, reason: SessionRejection.ExerciseNotInSession },
        });
      }
      expect(await api.db.select().from(setLog).where(eq(setLog.userId, user.userId))).toEqual([]);
    });

    it('answers 400 for a body that is not a valid set, and stores nothing', async () => {
      const { user, lower } = await player();
      const good = setOf(mainExerciseOf(lower).exerciseId, 1, 60, 5, 7);
      const path = sessionPath(lower.id, SessionSubpath.Sets);
      const bad: unknown[] = [
        undefined,
        {},
        { ...good, id: 'not-a-uuid' },
        { ...good, exerciseId: '' },
        { ...good, setNumber: 0 },
        { ...good, setNumber: MAX_LOGGED_SETS + 1 },
        { ...good, setNumber: 1.5 },
        { ...good, weightKg: -1 },
        { ...good, weightKg: 1001 },
        { ...good, reps: -1 },
        { ...good, reps: 2.5 },
        { ...good, rpe: 5 },
        { ...good, rpe: 11 },
        { ...good, rpe: 7.5 },
        { ...good, rpe: '7' },
      ];
      for (const body of bad) {
        const response = await user.call(HttpMethod.Post, path, body);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
      }
      const notJson = await fetch(`${api.baseUrl}${path}`, {
        method: HttpMethod.Post,
        headers: { authorization: `Bearer ${user.token}`, 'content-type': 'application/json' },
        body: '{nope',
      });
      expect(notJson.status).toBe(400);
      expect(await api.db.select().from(setLog).where(eq(setLog.userId, user.userId))).toEqual([]);
    });

    it('takes the extremes of the range: weight 0, no reps, RPE 6 and 10', async () => {
      const { user, lower } = await player();
      const { exerciseId } = mainExerciseOf(lower);
      for (const set of [
        setOf(exerciseId, 1, 0, 0, 6),
        setOf(exerciseId, MAX_LOGGED_SETS, 1000, 600, 10),
      ]) {
        expect((await postSet(user, lower.id, set)).status).toBe(200);
      }
    });
  });

  describe('POST /sessions/{id}/finish', () => {
    it('stores Load as session RPE times minutes, and shows the Session completed', async () => {
      const { user, week, lower } = await player();
      const finish = { id: crypto.randomUUID(), rpe: 7, minutes: 50 };

      const { status, result } = await postFinish(user, lower.id, finish);

      expect(status).toBe(200);
      expect(result).toMatchObject({
        status: RecordStatus.Saved,
        recorded: true,
        finished: { id: finish.id, rpe: 7, minutes: 50, load: 350 },
      });
      const shown = await readSessionOf(user, lower.id);
      expect(shown.status).toBe(SessionStatus.Completed);
      expect(shown.finished).toEqual(result.finished);
      const listed = (await getProgram(user))!.sessions;
      expect(listed.find(({ id }) => id === lower.id)!.status).toBe(SessionStatus.Completed);
      expect(
        listed.filter(({ id }) => id !== lower.id).every(({ status }) => status === 'planned'),
      ).toBe(true);
      expect(week.sessions).toHaveLength(listed.length);
      const [stored] = await api.db.select().from(session).where(eq(session.id, lower.id));
      expect(stored!.status).toBe(SessionStatus.Planned);
    });

    it('uses the Session’s planned minutes when none are given', async () => {
      const { user, lower } = await player();

      const { result } = await postFinish(user, lower.id, { id: crypto.randomUUID(), rpe: 8 });

      expect(result.finished).toMatchObject({ minutes: lower.minutes, load: 8 * lower.minutes });
    });

    it('answers 409 for a finish id that belongs to another Session, and stores nothing', async () => {
      const { user, lower, upper } = await player();
      const first = await postFinish(user, lower.id, { id: crypto.randomUUID(), rpe: 6 });

      const response = await user.call(
        HttpMethod.Post,
        sessionPath(upper.id, SessionSubpath.Finish),
        {
          id: first.result.finished.id,
          rpe: 7,
        },
      );

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: ApiErrorCode.IdTaken });
      expect(
        await api.db.select().from(sessionLog).where(eq(sessionLog.userId, user.userId)),
      ).toHaveLength(1);
    });

    it('ignores a second finish and returns the stored one', async () => {
      const { user, lower } = await player();
      const first = await postFinish(user, lower.id, {
        id: crypto.randomUUID(),
        rpe: 6,
        minutes: 40,
      });

      const again = await postFinish(user, lower.id, {
        id: crypto.randomUUID(),
        rpe: 10,
        minutes: 90,
      });
      const replay = await postFinish(user, lower.id, {
        id: first.result.finished.id,
        rpe: 10,
        minutes: 90,
      });

      for (const attempt of [again, replay]) {
        expect(attempt).toEqual({
          status: 200,
          result: { status: RecordStatus.Saved, recorded: false, finished: first.result.finished },
        });
      }
      expect(
        await api.db.select().from(sessionLog).where(eq(sessionLog.userId, user.userId)),
      ).toHaveLength(1);
    });

    it('takes no new set after the finish, but still acknowledges a replay of a stored one', async () => {
      const { user, lower } = await player();
      const { exerciseId } = mainExerciseOf(lower);
      const stored = setOf(exerciseId, 1, 60, 5, 7);
      await postSet(user, lower.id, stored);
      await postFinish(user, lower.id, { id: crypto.randomUUID(), rpe: 7 });

      const late = await postSet(user, lower.id, setOf(exerciseId, 2, 60, 5, 7));
      const replay = await postSet(user, lower.id, stored);

      expect(late).toEqual({
        status: 422,
        result: { status: RecordStatus.Rejected, reason: SessionRejection.SessionFinished },
      });
      expect(replay.result).toEqual({ status: RecordStatus.Saved, recorded: false });
      expect(mainExerciseOf(await readSessionOf(user, lower.id)).loggedSets).toEqual([stored]);
    });

    it('answers 400 for a body that is not a valid finish, and finishes nothing', async () => {
      const { user, lower } = await player();
      const good = { id: crypto.randomUUID(), rpe: 7, minutes: 45 };
      const bad: unknown[] = [
        undefined,
        {},
        { ...good, id: 'x' },
        { ...good, rpe: 0 },
        { ...good, rpe: 11 },
        { ...good, rpe: 6.5 },
        { ...good, minutes: 0 },
        { ...good, minutes: 301 },
        { ...good, minutes: 45.5 },
        { rpe: 7 },
      ];
      for (const body of bad) {
        const response = await user.call(
          HttpMethod.Post,
          sessionPath(lower.id, SessionSubpath.Finish),
          body,
        );
        expect(response.status).toBe(400);
      }
      expect((await readSessionOf(user, lower.id)).finished).toBeNull();
    });
  });

  describe('privacy', () => {
    it('answers 404 to another user logging a set or finishing, and shows them nothing', async () => {
      const { user, lower } = await player();
      const { exerciseId } = mainExerciseOf(lower);
      await postSet(user, lower.id, setOf(exerciseId, 1, 60, 5, 7));
      await postFinish(user, lower.id, { id: crypto.randomUUID(), rpe: 7 });
      const stranger = await programUser(api, { submission: padelPersona(), skip: 'consent' });

      const set = await stranger.call(
        HttpMethod.Post,
        sessionPath(lower.id, SessionSubpath.Sets),
        setOf(exerciseId, 2, 60, 5, 7),
      );
      const finish = await stranger.call(
        HttpMethod.Post,
        sessionPath(lower.id, SessionSubpath.Finish),
        { id: crypto.randomUUID(), rpe: 7 },
      );

      expect(set.status).toBe(404);
      expect(finish.status).toBe(404);
      const rows = await withUser(api.db, stranger.userId, async (tx) => ({
        sets: await tx.select().from(setLog),
        finishes: await tx.select().from(sessionLog),
      }));
      expect(rows).toEqual({ sets: [], finishes: [] });
      expect(await api.db.select().from(setLog).where(eq(setLog.sessionId, lower.id))).toHaveLength(
        1,
      );
    });

    it('lets the app role neither write another user’s rows nor change or delete its own', async () => {
      const { user, lower } = await player();
      const stranger = await programUser(api, { submission: padelPersona(), skip: 'consent' });
      const main = mainExerciseOf(lower);
      await postSet(user, lower.id, setOf(main.exerciseId, 1, 60, 5, 7));
      await postFinish(user, lower.id, { id: crypto.randomUUID(), rpe: 7 });
      type Tx = Parameters<Parameters<typeof withUser>[2]>[0];

      await expect(
        withUser(api.db, stranger.userId, (tx) =>
          tx.insert(setLog).values({
            id: crypto.randomUUID(),
            userId: user.userId,
            sessionId: lower.id,
            sessionExerciseId: main.id,
            exerciseId: main.exerciseId,
            setNumber: 2,
            weightKg: 1,
            reps: 1,
            rpe: 7,
          }),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      for (const change of [
        (tx: Tx) => tx.update(setLog).set({ reps: 99 }).where(eq(setLog.sessionId, lower.id)),
        (tx: Tx) => tx.delete(setLog).where(eq(setLog.sessionId, lower.id)),
        (tx: Tx) => tx.update(sessionLog).set({ rpe: 1 }).where(eq(sessionLog.sessionId, lower.id)),
        (tx: Tx) => tx.delete(sessionLog).where(eq(sessionLog.sessionId, lower.id)),
      ]) {
        await expect(withUser(api.db, user.userId, change)).rejects.toMatchObject({
          cause: { code: PG_INSUFFICIENT_PRIVILEGE },
        });
      }
    });

    it('is part of the export, and goes with the account', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);
      const set = setOf(main.exerciseId, 1, 60, 5, 7);
      await postSet(user, lower.id, set);
      const finished = (await postFinish(user, lower.id, { id: crypto.randomUUID(), rpe: 7 }))
        .result.finished;

      const exported = userExportSchema.parse(
        await (await user.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );

      expect(exported.setLogs).toEqual([
        { ...set, sessionId: lower.id, loggedAt: expect.any(String) },
      ]);
      expect(exported.sessionLogs).toEqual([{ ...finished, sessionId: lower.id }]);
      expect(exported.program!.sessions.find(({ id }) => id === lower.id)!.status).toBe(
        SessionStatus.Completed,
      );

      expect((await user.call(HttpMethod.Delete, ApiPath.Me)).status).toBe(204);
      for (const table of [setLog, sessionLog]) {
        expect(await api.db.select().from(table).where(eq(table.userId, user.userId))).toEqual([]);
      }
      expect(await api.db.select().from(appUser).where(eq(appUser.id, user.userId))).toEqual([]);
    });
  });

  describe('progression for the next Session', () => {
    const find = (detail: SessionDetail, exercise: SessionExercise) =>
      detail.exercises.find(({ exerciseId }) => exerciseId === exercise.exerciseId)!;

    /**
     * Logs `rpes` (one set each) of `exercise` in `from`, finishes it, and returns the same
     * exercise as the next Session (a week later, inserted as the table owner) shows it.
     */
    const nextAfter = async (
      user: FixtureUser,
      from: SessionDetail,
      exercise: SessionExercise,
      logged: { weightKg?: number; reps?: number; rpes: readonly number[]; finish?: boolean },
    ) => {
      await logSets(user, from.id, exercise.exerciseId, {
        weightKg: logged.weightKg ?? LOGGED_KG,
        reps: logged.reps ?? exercise.repMax,
        rpes: logged.rpes,
      });
      if (logged.finish !== false) {
        await postFinish(user, from.id, { id: crypto.randomUUID(), rpe: 7 });
      }
      const next = await readSessionOf(user, await insertNextSession(api, from.id, NEXT_WEEK));
      return find(next, exercise);
    };
    /** One set at each RPE: every prescribed set at the target RPE. */
    const atTarget = (exercise: SessionExercise, count = exercise.sets) =>
      Array<number>(count).fill(10 - exercise.rir!);

    it('has no suggestion before anything is logged', async () => {
      const { details } = await player();
      for (const detail of details) {
        for (const exercise of detail.exercises) {
          expect([exercise.suggestedWeightKg, exercise.progression]).toEqual([null, null]);
        }
      }
    });

    it('adds 2.5 kg to an upper-body exercise when every set hit the top of the range at the target RPE', async () => {
      const { user, upper } = await player();
      const main = mainExerciseOf(upper);
      expect(main.loadGuidance).toBe(LoadGuidance.RpeGuided);

      const next = await nextAfter(user, upper, main, { rpes: atTarget(main) });

      expect([next.progression, next.suggestedWeightKg]).toEqual([
        ProgressionOutcome.Increase,
        LOGGED_KG + 2.5,
      ]);
    });

    it('adds 5 kg to a lower-body exercise, and accepts sets easier than the target', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);
      const rpes = atTarget(main);
      rpes[0] = rpes[0]! - 1;

      const next = await nextAfter(user, lower, main, { rpes });

      expect([next.progression, next.suggestedWeightKg]).toEqual([
        ProgressionOutcome.Increase,
        LOGGED_KG + 5,
      ]);
    });

    it('ignores a Session that is not finished, and a Session never looks at what came after it', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);

      const unfinished = await nextAfter(user, lower, main, {
        rpes: atTarget(main),
        finish: false,
      });
      expect(unfinished).toMatchObject({ progression: null, suggestedWeightKg: null });
      await postFinish(user, lower.id, { id: crypto.randomUUID(), rpe: 7 });

      const earlier = find(await readSessionOf(user, lower.id), main);
      expect(earlier).toMatchObject({ progression: null, suggestedWeightKg: null });
    });

    it('takes 5 % off after two sets two points over the target, rounded to half a kilo', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);
      const target = 10 - main.rir!;
      expect(target + 2).toBeLessThanOrEqual(10);
      const rpes = atTarget(main);
      rpes[0] = target + 2;
      rpes[1] = target + 2;

      const next = await nextAfter(user, lower, main, { rpes, weightKg: 53 });

      // 53 x 0.95 = 50.35, which rounds to 50.5.
      expect([next.progression, next.suggestedWeightKg]).toEqual([
        ProgressionOutcome.Decrease,
        50.5,
      ]);
    });

    it('holds after one hard set', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);
      const rpes = atTarget(main);
      rpes[0] = 10 - main.rir! + 2;

      const next = await nextAfter(user, lower, main, { rpes });

      expect([next.progression, next.suggestedWeightKg]).toEqual([
        ProgressionOutcome.Hold,
        LOGGED_KG,
      ]);
    });

    it('holds when every set was one point over the target', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);

      const next = await nextAfter(user, lower, main, {
        rpes: atTarget(main).map((rpe) => rpe + 1),
      });

      expect(next.progression).toBe(ProgressionOutcome.Hold);
    });

    it('holds when a rep was missed', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);

      const next = await nextAfter(user, lower, main, {
        reps: main.repMax - 1,
        rpes: atTarget(main),
      });

      expect([next.progression, next.suggestedWeightKg]).toEqual([
        ProgressionOutcome.Hold,
        LOGGED_KG,
      ]);
    });

    it('holds when fewer sets than prescribed were logged', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);

      const next = await nextAfter(user, lower, main, { rpes: atTarget(main, main.sets - 1) });

      expect(next.progression).toBe(ProgressionOutcome.Hold);
    });

    it('starts from the heaviest weight logged, rounded to half a kilo', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);
      // Sets at 50, 66.3 and 55 kg, all at the target, one rep short: Hold at 66.3, so 66.5.
      for (const [index, weightKg] of [50, 66.3, 55].entries()) {
        await postSet(
          user,
          lower.id,
          setOf(main.exerciseId, index + 1, weightKg, main.repMax - 1, 10 - main.rir!),
        );
      }
      await postFinish(user, lower.id, { id: crypto.randomUUID(), rpe: 7 });

      const next = find(
        await readSessionOf(user, await insertNextSession(api, lower.id, NEXT_WEEK)),
        main,
      );

      expect([next.progression, next.suggestedWeightKg]).toEqual([ProgressionOutcome.Hold, 66.5]);
    });

    it('rounds an increase to half a kilo too', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);

      const next = await nextAfter(user, lower, main, { rpes: atTarget(main), weightKg: 61.3 });

      // 61.3 + 5 = 66.3, which rounds to 66.5.
      expect(next.suggestedWeightKg).toBe(66.5);
    });

    it('goes by the most recent finished Session that logged the exercise', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);
      const second = await readSessionOf(user, await insertNextSession(api, lower.id, NEXT_WEEK));

      const third = await (async () => {
        await logSets(user, lower.id, main.exerciseId, {
          weightKg: LOGGED_KG,
          reps: main.repMax,
          rpes: atTarget(main),
        });
        await postFinish(user, lower.id, { id: crypto.randomUUID(), rpe: 7 });
        // The second Session went worse: a rep short at 65 kg.
        await logSets(user, second.id, main.exerciseId, {
          weightKg: 65,
          reps: main.repMax - 1,
          rpes: atTarget(main),
        });
        await postFinish(user, second.id, { id: crypto.randomUUID(), rpe: 7 });
        return readSessionOf(user, await insertNextSession(api, lower.id, 2 * NEXT_WEEK));
      })();

      expect(find(third, main)).toMatchObject({
        progression: ProgressionOutcome.Hold,
        suggestedWeightKg: 65,
      });
      // The second Session itself is still judged by the first.
      expect(find(await readSessionOf(user, second.id), main)).toMatchObject({
        progression: ProgressionOutcome.Increase,
        suggestedWeightKg: LOGGED_KG + 5,
      });
    });

    it('gives a bodyweight exercise no weight and no progression', async () => {
      const { user, details } = await player();
      const found = details
        .flatMap((detail) => detail.exercises.map((exercise) => ({ detail, exercise })))
        .find(({ exercise }) => exercise.loadGuidance === LoadGuidance.Bodyweight);
      expect(found).toBeDefined();
      const { detail, exercise } = found!;

      const next = await nextAfter(user, detail, exercise, {
        rpes: Array<number>(exercise.sets).fill(7),
      });

      expect([next.progression, next.suggestedWeightKg]).toEqual([null, null]);
    });

    it('gives no weight when the logged weight was 0', async () => {
      const { user, lower } = await player();
      const main = mainExerciseOf(lower);

      const next = await nextAfter(user, lower, main, { weightKg: 0, rpes: atTarget(main) });

      expect([next.progression, next.suggestedWeightKg]).toEqual([null, null]);
    });

    it('does not apply sets done on a variant to the planned exercise', async () => {
      const { user, details } = await player();
      const found = details
        .flatMap((detail) => detail.exercises.map((exercise) => ({ detail, exercise })))
        .find(
          ({ exercise }) =>
            exercise.loadGuidance === LoadGuidance.RpeGuided &&
            (exercise.easier !== null || exercise.harder !== null),
        )!;
      const { detail, exercise } = found;
      const variant = (exercise.easier ?? exercise.harder)!;

      await logSets(user, detail.id, variant.exerciseId, {
        weightKg: LOGGED_KG,
        reps: exercise.repMax,
        rpes: Array<number>(exercise.sets).fill(10 - exercise.rir!),
      });
      await postFinish(user, detail.id, { id: crypto.randomUUID(), rpe: 7 });
      const next = find(
        await readSessionOf(user, await insertNextSession(api, detail.id, NEXT_WEEK)),
        exercise,
      );

      expect([next.progression, next.suggestedWeightKg]).toEqual([null, null]);
    });
  });
});
