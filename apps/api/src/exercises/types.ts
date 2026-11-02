import type { exercise } from '../db/schema.ts';

/** One row of the `exercise` table. */
export type ExerciseRow = typeof exercise.$inferSelect;

/** One row to write: the same columns. */
export type ExerciseRowInsert = typeof exercise.$inferInsert;
