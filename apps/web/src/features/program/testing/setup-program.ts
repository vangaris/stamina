import {
  createAppMediator,
  createServices,
  FAKE_INVITE,
  ServicesMode,
  type Services,
} from '@stamina/app-core';
import { SportKind, type ApiClient, type ProfileAnswers } from '@stamina/contracts';
import {
  ConsentPurpose,
  Goal,
  Intensity,
  LaunchSport,
  Need,
  SCREENING_QUESTIONS,
  ScreeningQuestion,
  StartingLevel,
  Units,
  Weekday,
} from '@stamina/domain';
import { Locale } from '@stamina/i18n';

const EMAIL = 'ada@example.com';
const FAKE_CODE = '424242';

export function profileAnswers(overrides: Partial<ProfileAnswers> = {}): ProfileAnswers {
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
    ...overrides,
  };
}

export interface SetupProgramOptions {
  /** Answers every Screening question no, except these. Null: no Screening taken. */
  screeningYes?: ScreeningQuestion[] | null;
  answers?: ProfileAnswers;
  /** Replaces some API calls. */
  api?: (base: ApiClient) => Partial<ApiClient>;
  signedIn?: boolean;
}

/** The real mediator over the in-memory services: signed in, onboarded, consented, screened by default. */
export async function setupProgram({
  screeningYes = [],
  answers = profileAnswers(),
  api,
  signedIn = true,
}: SetupProgramOptions = {}) {
  const services: Services = createServices({ mode: ServicesMode.Test });
  if (api) services.api = { ...services.api, ...api(services.api) };
  if (signedIn) {
    await services.auth.verifyEmailCode(EMAIL, FAKE_CODE);
    await services.api.saveProfile({ ...answers, inviteCode: FAKE_INVITE.validCode });
    for (const purpose of Object.values(ConsentPurpose)) {
      await services.api.grantConsent({ purpose, locale: Locale.En });
    }
    if (screeningYes) {
      await services.api.saveScreening({
        answers: Object.fromEntries(
          SCREENING_QUESTIONS.map((question) => [question, screeningYes.includes(question)]),
        ) as Record<ScreeningQuestion, boolean>,
        bodyAreas: [],
        startingLevel: StartingLevel.Beginner,
      });
    }
  }
  const mediator = createAppMediator({
    services,
    stores: { health: { set: () => undefined }, session: { set: () => undefined } },
  });
  return { services, mediator };
}
