import type { Mediator } from '@stamina/app-core';
import type {
  ProgramBlock,
  ProgramExercise,
  ProgramSession,
  ProgramWeek,
} from '@stamina/contracts';
import type { Locale } from '@stamina/i18n';
import type { RoutePath } from '../../enums/route-path.ts';
import type { LoadMessageKey } from './enums/load-message-key.ts';
import type { PrescriptionMessageKey } from './enums/prescription-message-key.ts';
import type { ProgramMessageKey } from './enums/program-message-key.ts';
import type { ProgramOutcomeKind } from './enums/program-outcome-kind.ts';
import type { ProgramPhase } from './enums/program-phase.ts';
import type { SessionBlockKind } from './enums/session-block-kind.ts';

export interface UseProgramOptions {
  /** Called when the person belongs on another screen (or must sign in again). */
  onNavigate: (path: RoutePath) => void;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
}

/** One day of the shown week: its date and the Session on it, if any. */
export interface WeekDay {
  /** `YYYY-MM-DD` (UTC). */
  date: string;
  session: ProgramSession | undefined;
}

/** The exercises of one block of a Session, in the order they are done. */
export interface SessionBlock {
  kind: SessionBlockKind;
  exercises: ProgramExercise[];
}

/** An i18n key with the arguments its message takes. */
export interface PrescriptionView {
  key: PrescriptionMessageKey;
  params: { sets: number; range: string; rir: number };
}

export interface LoadView {
  key: LoadMessageKey;
  params: { rir: number };
}

export interface BlockSummaryProps {
  block: ProgramBlock;
}

export interface SessionCardProps {
  session: ProgramSession;
  locale: Locale;
}

export interface ExerciseRowProps {
  exercise: ProgramExercise;
  locale: Locale;
}

export interface WeekListProps {
  days: WeekDay[];
  locale: Locale;
  /** Days with no Session are listed as free days. */
  showFreeDays: boolean;
}

export interface ProgramGateProps {
  phase: ProgramPhase;
  /** The reason shown when `phase` is failed. */
  messageKey: ProgramMessageKey | undefined;
}

export interface ProgramGateEmits {
  (event: 'retry'): void;
}

/** What asking for the week came to: the week, a reason there is none, or a screen to go to instead. */
export type ProgramOutcome =
  | { kind: ProgramOutcomeKind.Week; program: ProgramWeek }
  | { kind: ProgramOutcomeKind.Unavailable; messageKey: ProgramMessageKey }
  | { kind: ProgramOutcomeKind.Leave; path: RoutePath };
