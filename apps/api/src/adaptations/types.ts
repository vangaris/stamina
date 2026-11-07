import type { adaptation, adaptationDecision } from '../db/schema.ts';

export type AdaptationRow = typeof adaptation.$inferSelect;
export type AdaptationDecisionRow = typeof adaptationDecision.$inferSelect;

/** A stored Adaptation with its decision, if the person made one. */
export interface StoredAdaptation {
  row: AdaptationRow;
  decision: AdaptationDecisionRow | null;
}
