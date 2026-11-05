import type { sport } from '../db/schema.ts';

/** One row of the `sport` table. */
export type SportRow = typeof sport.$inferSelect;

export interface DraftSportProfileOptions {
  /** Replace a profile the draft already has (a researched file or a hand edit). Off by default. */
  overwrite?: boolean;
}
