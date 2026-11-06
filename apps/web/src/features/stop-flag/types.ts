import type { Mediator } from '@stamina/app-core';
import type { BodyArea, ScreeningQuestion, StopFlag } from '@stamina/domain';
import type { RoutePath } from '../../enums/route-path.ts';
import type { ScreeningDraft } from '../safety/index.ts';
import type { StopFlagMessageKey } from './enums/stop-flag-message-key.ts';
import type { StopOutcomeKind } from './enums/stop-outcome-kind.ts';

/** What a reported stop flag does, as the person is told: computed on the device from the domain rules. */
export interface StopOutcomeView {
  kind: StopOutcomeKind;
  /** The body area that is left out; only for `AreaExcluded`. */
  area: BodyArea | undefined;
  /** The emergency number to show with the stop message; nothing for flags that do not carry it. */
  emergencyNumber: string | undefined;
}

/** The answers to the repeated Screening questions as the sheet holds them: the draft the Screening page uses. */
export type RecheckDraft = ScreeningDraft;

/** What is wrong with the repeated questions: the unanswered ones, and a missing area. */
export interface RecheckErrors {
  answers: Partial<Record<ScreeningQuestion, StopFlagMessageKey>>;
  bodyAreas?: StopFlagMessageKey;
}

export interface UseStopFlagOptions {
  /** Called when the person belongs on another screen (the paused screen, Referred, sign-in, Today after a Session's stop). */
  onNavigate: (path: RoutePath) => void;
  /** Called when the person is done: the sheet can close. */
  onDone: () => void;
  /** The Session the report was made in, if any. Read when the report is made. */
  sessionId?: () => string | undefined;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
  /** Makes the id of a report. Defaults to `newId`. */
  newId?: () => string;
  /** The time now, for "today" on the person's calendar. Defaults to the browser's clock. */
  now?: () => Date;
}

export interface UsePausedOptions {
  onNavigate: (path: RoutePath) => void;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
}

export interface UseRestNoticeOptions {
  /** Defaults to the app mediator. */
  mediator?: Mediator;
  /** The time now, for "today" on the person's calendar. Defaults to the browser's clock. */
  now?: () => Date;
}

export interface ReportStopFlagContainerProps {
  /** The Session whose Stop button opened the sheet; nothing for the Check-in row. */
  sessionId?: string;
}

export interface ReportStopFlagContainerEmits {
  /** A stop flag was reported and the person went through what follows. */
  reported: [];
}

export interface StopFlagOptionsEmits {
  pick: [flag: StopFlag];
}

export interface StopFlagAreaPickerEmits {
  pick: [area: BodyArea];
}

export interface StopOutcomeProps {
  outcome: StopOutcomeView;
  /** Show the outcome's own heading (the sheet already shows it as its title). */
  showTitle: boolean;
}

export interface StopFlagRecheckProps {
  /** The questions to ask again, in order. */
  questions: readonly ScreeningQuestion[];
  draft: RecheckDraft;
  errors: RecheckErrors;
}

export interface StopFlagRecheckEmits {
  answer: [question: ScreeningQuestion, answer: boolean];
  'update:bodyAreas': [areas: BodyArea[]];
}

export interface PausedViewProps {
  outcomes: readonly StopOutcomeView[];
  busy: boolean;
  errorKey: StopFlagMessageKey | undefined;
}

export interface PausedViewEmits {
  confirm: [];
}
