import {
  HttpMethod,
  RecordStatus,
  SessionSubpath,
  finishSessionResultSchema,
  logSetResultSchema,
  sessionPath,
  sessionResponseSchema,
  type FinishSession,
  type LogSet,
  type ProgramWeek,
  type SessionDetail,
  type SessionExercise,
} from '@stamina/contracts';
import { addDays, LoadGuidance, SessionFocus, SessionSlot } from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { session, sessionExercise } from '../../src/db/schema.ts';
import { getProgram, postProgram } from './program-fixtures.ts';
import type { FixtureUser, TestApi } from './safety-fixtures.ts';

/** Calls `GET /sessions/{id}` and parses the answer when it is `200`. */
export async function getSession(
  user: FixtureUser,
  sessionId: string,
): Promise<{ status: number; session: SessionDetail | null }> {
  const response = await user.call(HttpMethod.Get, sessionPath(sessionId));
  return {
    status: response.status,
    session:
      response.status === 200 ? sessionResponseSchema.parse(await response.json()).session : null,
  };
}

/** The Session as the API shows it, failing the test when it is not there. */
export async function readSessionOf(user: FixtureUser, sessionId: string): Promise<SessionDetail> {
  const { status, session: found } = await getSession(user, sessionId);
  if (found === null) throw new Error(`get session failed: ${status}`);
  return found;
}

/** Calls `POST /sessions/{id}/sets`. */
export async function postSet(user: FixtureUser, sessionId: string, set: LogSet) {
  const response = await user.call(
    HttpMethod.Post,
    sessionPath(sessionId, SessionSubpath.Sets),
    set,
  );
  return { status: response.status, result: logSetResultSchema.parse(await response.json()) };
}

/** Calls `POST /sessions/{id}/finish`. */
export async function postFinish(user: FixtureUser, sessionId: string, finish: FinishSession) {
  const response = await user.call(
    HttpMethod.Post,
    sessionPath(sessionId, SessionSubpath.Finish),
    finish,
  );
  return {
    status: response.status,
    result: finishSessionResultSchema.parse(await response.json()),
  };
}

/** A set as the device would send it: a fresh id and the exercise, number, weight, reps and RPE. */
export const setOf = (
  exerciseId: string,
  setNumber: number,
  weightKg: number,
  reps: number,
  rpe: number,
): LogSet => ({ id: crypto.randomUUID(), exerciseId, setNumber, weightKg, reps, rpe });

/** Logs one set per RPE in `rpes` (set numbers from 1), each at `weightKg` and `reps`, expecting each to be stored. */
export async function logSets(
  user: FixtureUser,
  sessionId: string,
  exerciseId: string,
  { weightKg, reps, rpes }: { weightKg: number; reps: number; rpes: readonly number[] },
) {
  for (const [index, rpe] of rpes.entries()) {
    const { status, result } = await postSet(
      user,
      sessionId,
      setOf(exerciseId, index + 1, weightKg, reps, rpe),
    );
    if (status !== 200 || result.status !== RecordStatus.Saved || !result.recorded) {
      throw new Error(`logging set ${index + 1} failed: ${status}`);
    }
  }
}

/** A fresh user with a generated Program, and the Sessions of its week with their detail. */
export async function sessionsOf(
  user: FixtureUser,
): Promise<{ week: ProgramWeek; details: SessionDetail[] }> {
  const { status } = await postProgram(user);
  if (status !== 200) throw new Error(`program failed: ${status}`);
  const week = (await getProgram(user))!;
  const details = await Promise.all(week.sessions.map(({ id }) => readSessionOf(user, id)));
  return { week, details };
}

/** The first Session of the given focus. */
export const sessionWithFocus = (details: readonly SessionDetail[], focus: SessionFocus) => {
  const found = details.find((detail) => detail.focus === focus);
  if (found === undefined) throw new Error(`no ${focus} Session`);
  return found;
};

/** The first main-strength exercise of a Session that is loaded by reps in reserve, so it has a weight to progress. */
export const mainExerciseOf = (detail: SessionDetail): SessionExercise => {
  const found = detail.exercises.find(
    (exercise) =>
      exercise.slot === SessionSlot.MainStrength &&
      exercise.loadGuidance === LoadGuidance.RpeGuided &&
      exercise.rir !== null,
  );
  if (found === undefined) throw new Error('no weighted main-strength exercise');
  return found;
};

/**
 * Inserts, as the table owner, a later Session with the same exercises (new ids), `days` days after
 * `from`: the "next Session" of the same person. Returns its id.
 */
export async function insertNextSession(api: TestApi, from: string, days: number): Promise<string> {
  const [source] = await api.db.select().from(session).where(eq(session.id, from));
  const exercises = await api.db
    .select()
    .from(sessionExercise)
    .where(eq(sessionExercise.sessionId, from));
  const id = crypto.randomUUID();
  await api.db.insert(session).values({ ...source!, id, date: addDays(source!.date, days) });
  await api.db
    .insert(sessionExercise)
    .values(exercises.map((row) => ({ ...row, id: crypto.randomUUID(), sessionId: id })));
  return id;
}
