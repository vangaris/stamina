import type { Mediator } from '@stamina/app-core';
import type { SessionExercise } from '@stamina/contracts';
import type { PrescriptionUnit, SessionSlot } from '@stamina/domain';
import type { Locale } from '@stamina/i18n';
import type { RoutePath } from '../../enums/route-path.ts';
import type { LoadMessageKey } from '../program/index.ts';
import type { DocumentEvent } from './enums/document-event.ts';
import type { RestMessageKey } from './enums/rest-message-key.ts';
import type { SessionMessageKey } from './enums/session-message-key.ts';
import type { SessionPhase } from './enums/session-phase.ts';
import type { SetSaveStatus } from './enums/set-save-status.ts';
import type { SwapKind } from './enums/swap-kind.ts';
import type { TargetMessageKey } from './enums/target-message-key.ts';

/** An exercise's name in both languages (Greek is null until it is filled in). */
export type ExerciseName = SessionExercise['name'];

/** The easier or harder version an exercise is tagged with. */
export type ExerciseVariant = NonNullable<SessionExercise['easier']>;

/** The variant a person swapped each exercise to for this Session, keyed by the Session exercise's id. */
export type Swaps = Readonly<Record<string, string>>;

/** The part of `Storage` the swap store needs. */
export type SwapStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Where a Session's swaps are kept on this device. Reading never throws: nothing stored is an empty record. */
export interface SwapStore {
  read(sessionId: string): Swaps;
  write(sessionId: string, swaps: Swaps): void;
  clear(sessionId: string): void;
}

/** One exercise of the Session as the screen works with it: with any swap applied. */
export interface ExerciseView {
  exercise: SessionExercise;
  /** What sets are logged against: the planned exercise, or the variant it was swapped to. */
  exerciseId: string;
  name: ExerciseName;
  swapped: boolean;
  /** Sets logged so far, whichever of the two exercises they were done on. */
  doneSets: number;
}

/** The exercise and set that comes next. `position` is the exercise's index, `setNumber` starts at 1. */
export interface SetTarget {
  position: number;
  setNumber: number;
}

/** The values the steppers and chips hold for the set being logged. */
export interface SetDraft {
  weightKg: number;
  reps: number;
  rpe: number;
}

/** An i18n key with the arguments its message takes. */
export interface MessageView {
  key: TargetMessageKey | LoadMessageKey;
  params?: Record<string, string | number>;
}

/** Everything under the exercise's name: what to do, how hard, and which weight. */
export interface TargetView {
  prescription: MessageView;
  /** Null where effort is not rated (warm-up, cool-down). */
  effort: MessageView | undefined;
  /** The suggested weight and how it was reached, or how to find a weight; null where there is none. */
  weight: MessageView | undefined;
}

/** Everything Focus mode shows for the exercise on screen. */
export interface FocusModel {
  slot: SessionSlot;
  /** 1-based, "2 of 9". */
  position: number;
  total: number;
  name: string;
  swapped: boolean;
  target: TargetView;
  /** The set the steppers are for, from 1. */
  setNumber: number;
  plannedSets: number;
  doneSets: number;
  /** Dots to draw: the planned sets, and one more for each extra set done or being logged. */
  dotTotal: number;
  /** Every planned set is logged: the steppers wait behind "Add a set". */
  showSteppers: boolean;
  canAddSet: boolean;
  /** Only exercises with a weight to find get a weight stepper. */
  showWeight: boolean;
  unit: PrescriptionUnit;
  hasNextExercise: boolean;
  canSwap: boolean;
}

/** One line of the overview table. */
export interface OverviewRow {
  /** Where the exercise is in the Session; tapping the row jumps to it. */
  index: number;
  slot: SessionSlot;
  name: string;
  prescription: MessageView;
  doneSets: number;
  plannedSets: number;
  /** The exercise on screen in Focus mode. */
  current: boolean;
}

/** One exercise a swap can pick. */
export interface SwapOption {
  kind: SwapKind;
  exerciseId: string;
  name: string;
}

/** What the last logged set came to, shown as a small status line. */
export interface SetStatus {
  setId: string;
  setNumber: number;
  status: SetSaveStatus;
}

/** The exercise and set after the rest, shown on the rest timer. */
export interface NextSetView {
  name: string;
  setNumber: number;
}

/** The finished Session as the done screen shows it. */
export interface FinishedView {
  load: number;
  rpe: number;
  minutes: number;
  /** The finish is on this device, waiting for a connection. */
  queued: boolean;
}

/** Reads the time and calls back on an interval; the rest timer's seam, so tests need no real time. */
export interface RestClock {
  /** Epoch milliseconds. */
  now(): number;
  /** Calls `callback` every `ms` until the returned function is called. */
  every(callback: () => void, ms: number): () => void;
}

export interface UseRestTimerOptions {
  /** Called once a rest is over, whether it ran out or was skipped. */
  onEnd: () => void;
  clock?: RestClock;
}

/** The part of `navigator` that keeps the screen awake. */
export interface WakeLockNavigator {
  wakeLock?: Pick<WakeLock, 'request'> | undefined;
}

/** The part of `document` the wake lock watches: the page leaving and returning releases the lock. */
export interface WakeLockDocument {
  readonly visibilityState: string;
  addEventListener(type: DocumentEvent, listener: () => void): void;
  removeEventListener(type: DocumentEvent, listener: () => void): void;
}

export interface KeepAwakeHost {
  navigator: WakeLockNavigator;
  document: WakeLockDocument;
}

export interface UseSessionOptions {
  sessionId: string;
  /** The person's language now; names and numbers follow it. */
  locale: () => Locale;
  /** Called when the person belongs on another screen (or must sign in again). */
  onNavigate: (path: RoutePath) => void;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
  /** Defaults to the browser's `localStorage`. */
  swapStore?: SwapStore;
  /** Starts keeping the screen awake and returns what stops it. Defaults to the browser's wake lock. */
  keepAwake?: () => () => void;
  /** Makes the id of a set or a finish. Defaults to `newId`. */
  newId?: () => string;
  clock?: RestClock;
}

export interface SessionContainerProps {
  sessionId: string;
}

/** What the rest timer says aloud. */
export interface RestAnnouncement {
  key: RestMessageKey;
  params: { seconds: number };
}

export interface SessionGateProps {
  phase: SessionPhase;
  /** The reason shown when `phase` is failed. */
  messageKey: SessionMessageKey | undefined;
}

export interface SessionGateEmits {
  (event: 'retry'): void;
  (event: 'leave'): void;
}

export interface FocusViewProps {
  focus: FocusModel;
  /** What the last logged set came to; nothing while it is still being sent. */
  status: SetStatus | undefined;
  /** Why the last set or finish did not work. */
  errorKey: SessionMessageKey | undefined;
  locale: Locale;
}

export interface FocusViewEmits {
  (event: 'done'): void;
  (event: 'add-set'): void;
  (event: 'next'): void;
  (event: 'finish'): void;
  (event: 'overview'): void;
  (event: 'swap'): void;
}

export interface OverviewViewProps {
  rows: OverviewRow[];
}

export interface OverviewViewEmits {
  /** A row was tapped: its exercise's index. */
  (event: 'select', index: number): void;
  (event: 'back'): void;
  (event: 'finish'): void;
}

export interface SwapSheetProps {
  options: SwapOption[];
}

export interface SwapSheetEmits {
  (event: 'choose', option: SwapOption): void;
}

export interface ConfirmFinishSheetProps {
  /** Planned sets not logged yet. */
  left: number;
}

export interface ConfirmFinishSheetEmits {
  (event: 'confirm'): void;
}

export interface FinishViewProps {
  submitting: boolean;
  errorKey: SessionMessageKey | undefined;
}

export interface FinishViewEmits {
  (event: 'submit'): void;
  (event: 'back'): void;
}

export interface DoneViewProps {
  finished: FinishedView;
}

export interface DoneViewEmits {
  (event: 'today'): void;
  (event: 'week'): void;
}
