import type { ProgramRejection } from '@stamina/contracts';
import type { GenerateWeekInput, LaunchSport, PlayPattern } from '@stamina/domain';
import type { block, session, sessionExercise } from '../db/schema.ts';
import type { StoredPickInfo } from '../picks/index.ts';
import type { ProgramInputsStatus } from './enums/program-inputs-status.ts';

export type BlockRow = typeof block.$inferSelect;
export type SessionRow = typeof session.$inferSelect;
export type SessionExerciseRow = typeof sessionExercise.$inferSelect;

/** A stored exercise with the library name it shows under. */
export interface SessionExerciseWithName {
  row: SessionExerciseRow;
  name: { en: string; el: string | null };
}

/** Everything `toProgramWeek` needs to build the contract's week. */
export interface StoredWeek {
  block: BlockRow;
  sessions: readonly SessionRow[];
  exercises: readonly SessionExerciseWithName[];
  /** Ids of the week's Sessions that have a finish record; those read as completed. */
  finishedSessionIds: ReadonlySet<string>;
  /** The profile's play pattern, which gives the week's hard Activity dates; null without a profile. */
  play: PlayPattern | null;
}

/** What a stored week records besides the generated Sessions. */
export interface StoreWeekOptions {
  inputsHash: string;
  /** The person's sport is a requested one that is not approved yet. */
  beta: boolean;
  /** For each Session in `week.sessions` order: how the AI picked it, or `null` for the rules picker. */
  pickInfo: readonly (StoredPickInfo | null)[];
}

/** Everything the engine reads for a person's first week, or why it cannot run. */
export type ProgramInputs =
  | {
      status: ProgramInputsStatus.Ready;
      input: GenerateWeekInput;
      /** The person's sport is a requested one that is not approved yet. */
      beta: boolean;
      /** The launch sport they play, if any; the AI prompt names it. */
      sport: LaunchSport | null;
    }
  | { status: ProgramInputsStatus.Refused; reason: ProgramRejection };
