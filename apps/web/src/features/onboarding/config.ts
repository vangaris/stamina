import {
  Eligibility,
  MAX_PLAY_MINUTES,
  MAX_SESSIONS_PER_WEEK,
  MIN_PLAY_MINUTES,
  MIN_SESSIONS_PER_WEEK,
  Weekday,
} from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { OnboardingStep } from './enums/onboarding-step.ts';
import type { OnboardingDraft, StopReason } from './types.ts';

/** Where the invite screen finds why it was opened, in the route's query. */
export const NOTICE_QUERY_KEY = 'notice';

/** Browser autofill hints. */
export const COUNTRY_AUTOCOMPLETE = 'country';
export const BIRTH_YEAR_AUTOCOMPLETE = 'bday-year';
export const BIRTH_YEAR_LENGTH = 4;

/** The usual time playing starts here and moves in these steps (the domain's min and max bound it). */
export const DEFAULT_PLAY_MINUTES = 60;
export const PLAY_MINUTES_STEP = 15;
export const PLAY_MINUTES_RANGE = { min: MIN_PLAY_MINUTES, max: MAX_PLAY_MINUTES } as const;

export const DEFAULT_SESSIONS_PER_WEEK = 3;
export const SESSIONS_PER_WEEK_RANGE = {
  min: MIN_SESSIONS_PER_WEEK,
  max: MAX_SESSIONS_PER_WEEK,
} as const;

/** Language names are shown in their own language, so a person can always find theirs. */
export const LOCALE_NAMES: Record<Locale, string> = {
  [Locale.En]: 'English',
  [Locale.El]: 'Ελληνικά',
};

/** Only `en-US` defaults to imperial units; every other device language defaults to metric. */
export const IMPERIAL_LANGUAGE_TAG = 'en-us';

/** The screens in order. People who only want food skip the training week. */
export const STEPS_WITH_TRAINING: readonly OnboardingStep[] = [
  OnboardingStep.About,
  OnboardingStep.Sport,
  OnboardingStep.Goal,
  OnboardingStep.Week,
];
export const STEPS_FOOD_ONLY: readonly OnboardingStep[] = [
  OnboardingStep.About,
  OnboardingStep.Sport,
  OnboardingStep.Goal,
];

/** i18n keys of the two screens that stop someone (age is checked before country). */
export const STOP_MESSAGES: Record<StopReason, { title: string; body: string }> = {
  [Eligibility.UnderAge]: {
    title: 'onboarding.stop.underAge.title',
    body: 'onboarding.stop.underAge.body',
  },
  [Eligibility.OutsideEea]: {
    title: 'onboarding.stop.outsideEea.title',
    body: 'onboarding.stop.outsideEea.body',
  },
};

/** Weekdays in the order they are shown and sent: Monday first. */
export const WEEKDAYS: readonly Weekday[] = Object.values(Weekday);

/** Changing one answer also clears the message shown beside these answers. */
export const ERRORS_CLEARED_WITH: Partial<
  Record<keyof OnboardingDraft, (keyof OnboardingDraft)[]>
> = {
  playVaries: ['playDays'],
  sessionsPerWeek: ['availableDays'],
  sport: ['otherSportName'],
};
