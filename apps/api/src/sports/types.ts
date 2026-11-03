import type { sport } from '../db/schema.ts';

/** One row of the `sport` table. */
export type SportRow = typeof sport.$inferSelect;

/** One row to write: the same columns. */
export type SportRowInsert = typeof sport.$inferInsert;
