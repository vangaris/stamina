import type { Mediator } from '@stamina/app-core';
import type {
  Eligibility,
  Goal,
  Intensity,
  LaunchSport,
  Need,
  Units,
  Weekday,
} from '@stamina/domain';
import type { SportKind } from '@stamina/contracts';
import type { Locale } from '@stamina/i18n';
import type { OnboardingExit } from './enums/onboarding-exit.ts';
import type { OnboardingMessageKey } from './enums/onboarding-message-key.ts';
import type { StartMessageKey } from './enums/start-message-key.ts';
import type { StartNotice } from './enums/start-notice.ts';

/** Why someone cannot go on: the two ways `checkEligibility` says no. */
export type StopReason = Eligibility.UnderAge | Eligibility.OutsideEea;

/**
 * Everything typed or picked on the screens, as the screens hold it: not yet validated, so
 * choices can be missing and the birth year is still text. `toProfileAnswers` turns it into
 * what is sent. Lives in memory only until the profile is saved.
 */
export interface OnboardingDraft {
  needs: Need | undefined;
  birthYear: string;
  /** ISO country code; empty until chosen. */
  country: string;
  locale: Locale;
  units: Units;
  /** A launch sport, or `SportKind.Other` for "Other…". */
  sport: LaunchSport | SportKind.Other | undefined;
  otherSportName: string;
  playDays: Weekday[];
  playVaries: boolean;
  playMinutes: number;
  playIntensity: Intensity | undefined;
  goal: Goal | undefined;
  sessionsPerWeek: number;
  sessionMinutes: number | undefined;
  availableDays: Weekday[];
}

/** The message to show beside each answer that is not usable yet. */
export type FieldErrors = Partial<Record<keyof OnboardingDraft, OnboardingMessageKey>>;

export interface UseInviteStartOptions {
  /** Called once the code is valid and remembered. */
  onValid: () => void;
  /** Why the screen was opened, when it was not by the person's own choice. */
  notice?: StartNotice | undefined;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
}

export interface UseOnboardingOptions {
  /** Called when the person leaves the screens; the container turns each exit into a route. */
  onExit: (exit: OnboardingExit) => void;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
  /** The year "now" falls in (age is year-based). Defaults to the current year. */
  currentYear?: number;
  /** The device's preferred languages; pre-fill locale and units. Defaults to `navigator.languages`. */
  languages?: readonly string[];
  /** Switches the app's language when the person picks another. Defaults to the app's i18n. */
  applyLocale?: (locale: Locale) => void;
}

export interface InviteStepProps {
  code: string;
  errorKey?: StartMessageKey | undefined;
  noticeKey?: StartMessageKey | undefined;
  busy: boolean;
}

export interface InviteStepEmits {
  'update:code': [code: string];
  submit: [];
  'sign-in': [];
}

/** One answer changed on a screen. */
export type DraftUpdate = {
  [K in keyof OnboardingDraft]: { field: K; value: OnboardingDraft[K] };
}[keyof OnboardingDraft];

/** The frame around every question screen: title, progress, Back and Continue / Finish. */
export interface StepFrameProps {
  title: string;
  /** 1-based position among the screens this person will see. */
  stepNumber: number;
  stepCount: number;
  busy: boolean;
  /** Set when saving failed for a reason that is not one of the answers. */
  errorKey?: OnboardingMessageKey | undefined;
}

export interface StepFrameEmits {
  next: [];
  back: [];
}

/** What every question screen takes: the frame's props (minus the title it knows) and the answers. */
export interface StepProps extends Omit<StepFrameProps, 'title'> {
  draft: OnboardingDraft;
  errors: FieldErrors;
}

export interface StepEmits {
  update: [change: DraftUpdate];
  next: [];
  back: [];
}

export interface StopNoticeProps {
  reason: StopReason;
}

export interface StopNoticeEmits {
  change: [];
}

export interface FieldErrorProps {
  /** The translated message; empty when there is none. */
  message?: string | undefined;
}
