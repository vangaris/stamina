import type { block, session, sessionExercise } from '../db/schema.ts';

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
}
