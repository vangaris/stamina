import {
  HttpMethod,
  RecordStatus,
  acceptAdaptationResultSchema,
  adaptationListSchema,
  adaptationPath,
  AdaptationSubpath,
  declineAdaptationResultSchema,
  type Adaptation,
  type AcceptAdaptation,
  type ProgramWeek,
} from '@stamina/contracts';
import { AdaptationRule, Intensity, SessionFocus } from '@stamina/domain';
import { asc, eq } from 'drizzle-orm';
import { block, session, sessionExercise } from '../../src/db/schema.ts';
import { activityOf, postActivity } from './activity-fixtures.ts';
import { checkinOf, postCheckin } from './checkin-fixtures.ts';
import type { FixtureUser, TestApi } from './safety-fixtures.ts';

/** Calls `GET /adaptations` (which also runs the rules) and parses the answer. */
export async function getAdaptations(user: FixtureUser) {
  const response = await user.call(HttpMethod.Get, adaptationPath());
  if (response.status !== 200) throw new Error(`get adaptations failed: ${response.status}`);
  return adaptationListSchema.parse(await response.json()).adaptations;
}

/** The pending suggestion of `ruleId`, failing the test when there is none or more than one. */
export async function adaptationOf(user: FixtureUser, ruleId: AdaptationRule): Promise<Adaptation> {
  const found = (await getAdaptations(user)).filter((adaptation) => adaptation.ruleId === ruleId);
  if (found.length !== 1) throw new Error(`expected one ${ruleId}, found ${found.length}`);
  return found[0]!;
}

/** The rules of the pending suggestions, in the order listed. */
export async function pendingRules(user: FixtureUser): Promise<AdaptationRule[]> {
  return (await getAdaptations(user)).map(({ ruleId }) => ruleId);
}

/** Calls `POST /adaptations/{id}/accept` with the basis the suggestion listed (or `basis`, to send another). */
export async function postAccept(
  user: FixtureUser,
  adaptation: Pick<Adaptation, 'id' | 'basis'>,
  basis: AcceptAdaptation['basis'] = adaptation.basis,
) {
  const response = await user.call(
    HttpMethod.Post,
    adaptationPath(adaptation.id, AdaptationSubpath.Accept),
    { basis },
  );
  return {
    status: response.status,
    result: acceptAdaptationResultSchema.parse(await response.json()),
  };
}

/** Calls `POST /adaptations/{id}/decline`. */
export async function postDecline(user: FixtureUser, adaptationId: string) {
  const response = await user.call(
    HttpMethod.Post,
    adaptationPath(adaptationId, AdaptationSubpath.Decline),
  );
  return {
    status: response.status,
    result: declineAdaptationResultSchema.parse(await response.json()),
  };
}

/** Accepts the suggestion and returns the Program it answers with, failing the test unless it was recorded. */
export async function acceptedProgram(
  user: FixtureUser,
  adaptation: Pick<Adaptation, 'id' | 'basis'>,
): Promise<ProgramWeek> {
  const { status, result } = await postAccept(user, adaptation);
  if (status !== 200 || result.status !== RecordStatus.Saved || !result.recorded) {
    throw new Error(`accept failed: ${status}`);
  }
  return result.program;
}

/** The Session of the Program with this focus (the first by date), failing the test when there is none. */
export const sessionOfFocus = (week: ProgramWeek, focus: SessionFocus) => {
  const found = week.sessions.find((planned) => planned.focus === focus);
  if (found === undefined) throw new Error(`no ${focus} Session`);
  return found;
};

/** Posts a poor Check-in (sleep 1, soreness 1, energy 1) for `date` and returns its id. */
export async function postPoorCheckin(user: FixtureUser, date: string): Promise<string> {
  const entry = checkinOf(date, { sleep: 1, soreness: 1, energy: 1 });
  await postCheckin(user, entry);
  return entry.id;
}

/** Posts a good Check-in (every answer 4) for `date`. */
export async function postGoodCheckin(user: FixtureUser, date: string): Promise<void> {
  await postCheckin(user, checkinOf(date, { sleep: 4, soreness: 4, energy: 4 }));
}

/** Posts a hard "I played" of `minutes` on `date`; the day is not a play day of the personas, so it is unplanned. */
export async function postHardActivity(user: FixtureUser, date: string, minutes = 60) {
  return postActivity(user, activityOf(date, { intensity: Intensity.Hard, minutes }));
}

/** Every Session row of the user, any revision, as the table owner, by date then revision. */
export const sessionRowsOf = (api: TestApi, userId: string) =>
  api.db
    .select()
    .from(session)
    .where(eq(session.userId, userId))
    .orderBy(asc(session.date), asc(session.revision));

/** Every Block row of the user by position, as the table owner. */
export const blockRowsOf = (api: TestApi, userId: string) =>
  api.db.select().from(block).where(eq(block.userId, userId)).orderBy(asc(block.position));

/** The exercise rows of one stored Session, in order, as the table owner. */
export const exerciseRowsOf = (api: TestApi, sessionId: string) =>
  api.db
    .select()
    .from(sessionExercise)
    .where(eq(sessionExercise.sessionId, sessionId))
    .orderBy(asc(sessionExercise.position));
