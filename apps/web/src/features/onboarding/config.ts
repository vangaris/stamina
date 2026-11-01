import { ProfileRejection, SportKind } from '@stamina/contracts';
import {
  LaunchSport,
  MAX_SESSIONS_PER_WEEK,
  MIN_SESSIONS_PER_WEEK,
  TrainingWeekProblem,
  Weekday,
} from '@stamina/domain';
import { AppErrorCode } from '@stamina/app-core';
import { Locale } from '@stamina/i18n';
import type { RouteLocationRaw } from 'vue-router';
import { RoutePath } from '../../enums/route-path.ts';
import { OnboardingExit } from './enums/onboarding-exit.ts';
import { OnboardingMessageKey } from './enums/onboarding-message-key.ts';
import { OnboardingStep } from './enums/onboarding-step.ts';
import { StartExit } from './enums/start-exit.ts';
import { StartMessageKey } from './enums/start-message-key.ts';
import { StartNotice } from './enums/start-notice.ts';
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

/** The sports a person can pick: the launch sports, then "Other…". */
export const SPORT_CHOICES: readonly (LaunchSport | SportKind.Other)[] = [
  ...Object.values(LaunchSport),
  SportKind.Other,
];

/** Weekdays in the order they are shown and sent: Monday first. */
export const WEEKDAYS: readonly Weekday[] = Object.values(Weekday);

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

/** The two screens that stop someone (age is checked before country). */
export const STOP_MESSAGES: Record<
  StopReason,
  { title: OnboardingMessageKey; body: OnboardingMessageKey }
> = {
  [ProfileRejection.UnderAge]: {
    title: OnboardingMessageKey.UnderAgeTitle,
    body: OnboardingMessageKey.UnderAgeBody,
  },
  [ProfileRejection.OutsideEea]: {
    title: OnboardingMessageKey.OutsideEeaTitle,
    body: OnboardingMessageKey.OutsideEeaBody,
  },
};

/** Changing one answer also clears the message shown beside these answers. */
export const ERRORS_CLEARED_WITH: Partial<
  Record<keyof OnboardingDraft, (keyof OnboardingDraft)[]>
> = {
  playVaries: ['playDays'],
  sessionsPerWeek: ['availableDays'],
  sport: ['otherSportName'],
};

/** Which answer, and which message, each way of failing the training week points at. */
export const KEY_FOR_PROBLEM: Record<TrainingWeekProblem, keyof OnboardingDraft> = {
  [TrainingWeekProblem.SessionsOutOfRange]: 'sessionsPerWeek',
  [TrainingWeekProblem.LengthNotOffered]: 'sessionMinutes',
  [TrainingWeekProblem.TooFewAvailableDays]: 'availableDays',
};
export const MESSAGE_FOR_PROBLEM: Record<TrainingWeekProblem, OnboardingMessageKey> = {
  [TrainingWeekProblem.SessionsOutOfRange]: OnboardingMessageKey.SessionsPerWeek,
  [TrainingWeekProblem.LengthNotOffered]: OnboardingMessageKey.SessionMinutes,
  [TrainingWeekProblem.TooFewAvailableDays]: OnboardingMessageKey.AvailableDays,
};

/** What a request that failed shows: the message for its error code, else the generic one. */
export const SAVE_ERROR_KEYS: Partial<Record<AppErrorCode, OnboardingMessageKey>> = {
  [AppErrorCode.Offline]: OnboardingMessageKey.Offline,
};
export const START_ERROR_KEYS: Partial<Record<AppErrorCode, StartMessageKey>> = {
  // An empty code is the person's to fix; the mediator reports it as a failed validation.
  [AppErrorCode.ValidationFailed]: StartMessageKey.Empty,
  [AppErrorCode.Offline]: StartMessageKey.Offline,
};

/** Where each way of leaving the screens goes. */
export const ROUTE_FOR_EXIT: Record<OnboardingExit, RouteLocationRaw> = {
  [OnboardingExit.SignedOut]: RoutePath.Start,
  [OnboardingExit.ProfileExists]: RoutePath.Today,
  [OnboardingExit.InviteNeeded]: RoutePath.Start,
  [OnboardingExit.InviteRejected]: {
    path: RoutePath.Start,
    query: { [NOTICE_QUERY_KEY]: StartNotice.InviteRejected },
  },
  [OnboardingExit.Finished]: RoutePath.Today,
};
export const ROUTE_FOR_START_EXIT: Record<StartExit, RouteLocationRaw> = {
  [StartExit.SignIn]: RoutePath.SignIn,
  [StartExit.Onboarding]: RoutePath.Onboarding,
};
