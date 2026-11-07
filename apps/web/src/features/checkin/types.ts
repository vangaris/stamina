import type { Mediator } from '@stamina/app-core';
import type { RoutePath } from '../../enums/route-path.ts';
import type { CheckinMessageKey } from './enums/checkin-message-key.ts';
import type { CheckinQuestionKey } from './enums/checkin-question-key.ts';

/** Every question answered: each 1 (low) to 5 (high). */
export type CheckinAnswers = Record<CheckinQuestionKey, number>;

/** The answers given so far. */
export type CheckinDraft = Partial<CheckinAnswers>;

export interface UseCheckinOptions {
  /** Called when the person must sign in again. */
  onNavigate: (path: RoutePath) => void;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
  /** Makes the id of a Check-in. Defaults to `newId`. */
  newId?: () => string;
  /** The time now, for "today" on the person's calendar. Defaults to the browser's clock. */
  now?: () => Date;
}

export interface CheckinQuestionProps {
  question: CheckinQuestionKey;
  /** The place of the question, from 1. */
  step: number;
  total: number;
  /** The chips, low end first. */
  scores: readonly number[];
  /** The answer given before, if any. */
  selected: number | undefined;
  canGoBack: boolean;
  /** The answers are being sent: the chips wait. */
  sending: boolean;
  /** What went wrong sending, with a button to try again. */
  errorKey: CheckinMessageKey | undefined;
}

export interface CheckinQuestionEmits {
  (event: 'answer', score: number): void;
  (event: 'back'): void;
  (event: 'retry'): void;
}

export interface CheckinDoneProps {
  answers: CheckinAnswers;
  /** Saved, or saved on this phone. */
  messageKey: CheckinMessageKey | undefined;
  /** The "anything unusual" row is finished: hide it. */
  unusualDone: boolean;
}

export interface CheckinDoneEmits {
  (event: 'nothing-unusual'): void;
  (event: 'something-unusual'): void;
}
