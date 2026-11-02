import { ApiPath, HttpMethod, type ScreeningSubmission } from '@stamina/contracts';
import { BodyArea, ConsentPurpose, Goal, ScreeningQuestion, StartingLevel } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { HttpHeader } from '../../src/enums/http-header.ts';
import { issueInvite, validSubmission } from './profile-fixtures.ts';
import type { startTestApi } from './test-api.ts';

export type TestApi = Awaited<ReturnType<typeof startTestApi>>;

/** SQLSTATE 42501: a statement or row failed the privileges or policy. */
export const PG_INSUFFICIENT_PRIVILEGE = '42501';

/** A submission whose answers are all no, except the questions in `yes`. */
export function screeningSubmission(
  yes: readonly ScreeningQuestion[] = [],
  overrides: Partial<ScreeningSubmission> = {},
): ScreeningSubmission {
  const answers = Object.fromEntries(
    Object.values(ScreeningQuestion).map((question) => [question, yes.includes(question)]),
  ) as Record<ScreeningQuestion, boolean>;
  return {
    answers,
    bodyAreas: yes.includes(ScreeningQuestion.BoneJointMuscle) ? [BodyArea.Knee] : [],
    startingLevel: StartingLevel.Beginner,
    ...overrides,
  };
}

/** A fresh signed-in fixture user and a way to call the API as them. */
export async function newUser(api: TestApi) {
  const userId = crypto.randomUUID();
  const token = await api.signToken(userId);
  const call = (method: HttpMethod, path: string, body?: unknown, withToken = true) =>
    fetch(`${api.baseUrl}${path}`, {
      method,
      headers: {
        ...(withToken ? { [HttpHeader.Authorization]: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  return { userId, token, call };
}

export type FixtureUser = Awaited<ReturnType<typeof newUser>>;

/** Gives both consents through the API. */
export async function consentToBoth(user: FixtureUser, locale: Locale = Locale.En) {
  for (const purpose of Object.values(ConsentPurpose)) {
    const response = await user.call(HttpMethod.Post, ApiPath.Consent, { purpose, locale });
    if (response.status !== 200) throw new Error(`consent failed: ${response.status}`);
  }
}

/** Saves the user's profile through the API (with a fresh invite); screening needs one first. */
export async function saveProfileFor(
  api: TestApi,
  user: FixtureUser,
  goal: Goal = Goal.SportPerformance,
) {
  const inviteCode = await issueInvite(api.db);
  const response = await user.call(
    HttpMethod.Post,
    ApiPath.Profile,
    validSubmission({ goal, inviteCode }),
  );
  if (response.status !== 200) throw new Error(`profile failed: ${response.status}`);
}
