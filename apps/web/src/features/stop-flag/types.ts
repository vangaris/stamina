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

/** The part of `localStorage` the owed re-asks need; tests pass a memory one. */
export interface RecheckOwedStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

/** Which stop flags still owe the person their repeated Screening questions, kept on this device. */
export interface RecheckOwedStore {
  /** The flags whose questions are owed, in the order they were reported. */
  owed: () => StopFlag[];
  /** A report was saved and asks questions again: they are owed until answered. */
  owe: (flag: StopFlag) => void;
  /** The questions of `flag` were answered (or refused by a rule); they are no longer owed. */
  settle: (flag: StopFlag) => void;
}

/** The words of the paused screen's button and the hint under it, as message keys. */
export interface PausedConfirmCopy {
  label: StopFlagMessageKey;
  hint: StopFlagMessageKey;
}

export interface UseRecheckOptions {
  mediator: Mediator;
  /** Called when the server took the answers or refused them by a rule: anything but a failure to send. */
  onSettled: () => void;
}

/** A repeated-questions submit that is done with: where the person goes now, or nowhere (carry on). */
export interface RecheckResult {
  path: RoutePath | undefined;
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
  /** Where the questions a report asks again are noted until answered. Defaults to one over `localStorage`. */
  recheckOwed?: RecheckOwedStore;
}

export interface UsePausedOptions {
  onNavigate: (path: RoutePath) => void;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
  /** Which re-asks are still owed. Defaults to one over `localStorage`. */
  recheckOwed?: RecheckOwedStore;
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
