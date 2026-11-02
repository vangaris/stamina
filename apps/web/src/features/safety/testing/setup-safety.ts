import {
  createAppMediator,
  createServices,
  FAKE_INVITE,
  ServicesMode,
  type Services,
} from '@stamina/app-core';
import {
  Goal,
  Intensity,
  LaunchSport,
  Need,
  SCREENING_QUESTIONS,
  ScreeningQuestion,
  StartingLevel,
  Units,
  Weekday,
  ConsentPurpose,
} from '@stamina/domain';
import type { BodyArea } from '@stamina/domain';
import {
  SportKind,
  type ApiClient,
  type ProfileAnswers,
  type ScreeningSubmission,
} from '@stamina/contracts';
import { Locale } from '@stamina/i18n';

const EMAIL = 'ada@example.com';
const FAKE_CODE = '424242';

/** A grown-up in Greece who plays padel and wants to get stronger: the shortest way past onboarding's checks. */
export function profileAnswers(): ProfileAnswers {
  return {
    needs: Need.Both,
    birthYear: 1990,
    country: 'GR',
    sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
    playDays: [Weekday.Tue],
    playVaries: false,
    playMinutes: 90,
    playIntensity: Intensity.Moderate,
    goal: Goal.Strength,
    trainingWeek: {
      sessionsPerWeek: 3,
      sessionMinutes: 45,
      availableDays: [Weekday.Mon, Weekday.Wed, Weekday.Fri],
    },
    locale: Locale.En,
    units: Units.Metric,
  };
}

export interface SetupSafetyOptions {
  signedIn?: boolean;
  /** Whether the profile is saved. Defaults to `signedIn`. */
  onboarded?: boolean;
  /** Replaces some API calls. */
  api?: (base: ApiClient) => Partial<ApiClient>;
}

/**
 * The real mediator over the in-memory services, signed in with a saved profile by default (what
 * every safety screen assumes).
 */
export async function setupSafety({
  signedIn = true,
  onboarded = signedIn,
  api,
}: SetupSafetyOptions = {}) {
  const services: Services = createServices({ mode: ServicesMode.Test });
  if (api) services.api = { ...services.api, ...api(services.api) };
  if (signedIn) await services.auth.verifyEmailCode(EMAIL, FAKE_CODE);
  if (onboarded) {
    await services.api.saveProfile({ ...profileAnswers(), inviteCode: FAKE_INVITE.validCode });
  }
  const mediator = createAppMediator({
    services,
    stores: { health: { set: () => undefined }, session: { set: () => undefined } },
  });
  return { services, mediator };
}

/** All ten answers no, except the given ones. */
export function screeningSubmission(
  yes: ScreeningQuestion[] = [],
  bodyAreas: BodyArea[] = [],
): ScreeningSubmission {
  return {
    answers: Object.fromEntries(
      SCREENING_QUESTIONS.map((question) => [question, yes.includes(question)]),
    ) as ScreeningSubmission['answers'],
    bodyAreas,
    startingLevel: StartingLevel.Beginner,
  };
}

export async function grantBothConsents(services: Services) {
  for (const purpose of Object.values(ConsentPurpose)) {
    await services.api.grantConsent({ purpose, locale: Locale.En });
  }
}
