import type { ExerciseVariant, FinishedSession } from '@stamina/contracts';
import type { Emphasis, MovementPattern } from '@stamina/domain';
import type { session, sessionExercise, setLog } from '../db/schema.ts';

export type SessionRow = typeof session.$inferSelect;
export type SessionExerciseRow = typeof sessionExercise.$inferSelect;
export type SetLogRow = typeof setLog.$inferSelect;

/** A planned exercise of a Session with its library name, movement pattern and tagged variants. */
export interface PlannedExercise {
  row: SessionExerciseRow;
  name: { en: string; el: string | null };
  movementPattern: MovementPattern;
  easier: ExerciseVariant | null;
  harder: ExerciseVariant | null;
}

/** A stored Session as planned, in the order its exercises are done, and its finish record if any. */
export interface SessionPlan {
  session: SessionRow;
  emphasis: Emphasis;
  exercises: readonly PlannedExercise[];
  finished: FinishedSession | null;
}
