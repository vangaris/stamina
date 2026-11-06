import type { Mediator } from '@stamina/app-core';
import type {
  ProgramBlock,
  ProgramExercise,
  ProgramSession,
  ProgramWeek,
} from '@stamina/contracts';
import type { Emphasis } from '@stamina/domain';
import type { Locale } from '@stamina/i18n';
import type { ActivitiesByDate } from '../activity/index.ts';
import type { RoutePath } from '../../enums/route-path.ts';
import type { LoadMessageKey } from './enums/load-message-key.ts';
import type { PrescriptionMessageKey } from './enums/prescription-message-key.ts';
import type { ProgramMessageKey } from './enums/program-message-key.ts';
import type { ProgramOutcomeKind } from './enums/program-outcome-kind.ts';
import type { ProgramPhase } from './enums/program-phase.ts';
import type { SessionBlockKind } from './enums/session-block-kind.ts';
import type { SessionProgress } from './enums/session-progress.ts';

export interface UseProgramOptions {
  /** Called when the person belongs on another screen (or must sign in again). */
  onNavigate: (path: RoutePath) => void;
  /** Defaults to the app mediator. */
  mediator?: Mediator;
}

/** One day of the shown week: its date, the Session on it if any, and whether a hard Activity is planned. */
export interface WeekDay {
  /** `YYYY-MM-DD` (UTC). */
  date: string;
  session: ProgramSession | undefined;
  /** A hard Activity (a match, say) is planned: a play day, not a free one. */
  hardActivity: boolean;
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
  /** Only the weight-guided message takes the reserve. */
  params?: { rir: number };
}

export interface BlockSummaryProps {
  block: ProgramBlock;
}

export interface SessionCardProps {
  session: ProgramSession;
  /** The Block's emphasis: power and speed adds a cue beside the main-strength work. */
  emphasis: Emphasis;
  locale: Locale;
  /** Where the Session stands; the card offers to start or continue it, or says it is done. Nothing: no action (the reveal). */
  progress?: SessionProgress | undefined;
}

export interface ExerciseRowProps {
  exercise: ProgramExercise;
  locale: Locale;
}

export interface WeekListProps {
  days: WeekDay[];
  emphasis: Emphasis;
  locale: Locale;
  /** Days with no Session are listed, as free days or play days. */
  showFreeDays: boolean;
  /** Where each Session stands, by Session id. Without it the cards offer no action. */
  progress?: Readonly<Record<string, SessionProgress>> | undefined;
  /** The week's planned and played Activities by date; a day with one shows it instead of the bare play-day note. */
  activities?: ActivitiesByDate | undefined;
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
