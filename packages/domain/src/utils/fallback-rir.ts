import { BLOCK_RIR_BY_WEEK, LIMITED_RIR_FLOOR } from '../config.ts';
import { TrainingMode } from '../enums/training-mode.ts';
import type { AdaptationContext, AdaptationSession } from '../types.ts';

/**
 * Reps in reserve for a new rated exercise whose predecessor was not rated: the most the Session
 * already carries, or the Block week's own number (at least the Limited floor in Limited mode)
 * when the Session rates nothing.
 */
export function fallbackRir(
  { weekInBlock, generation }: AdaptationContext,
  session: AdaptationSession,
): number {
  const rated = session.exercises.flatMap((exercise) =>
    exercise.rir === null ? [] : [exercise.rir],
  );
  if (rated.length > 0) return Math.max(...rated);
  const base = BLOCK_RIR_BY_WEEK[Math.min(weekInBlock, BLOCK_RIR_BY_WEEK.length) - 1]!;
  return generation.mode === TrainingMode.Limited ? Math.max(base, LIMITED_RIR_FLOOR) : base;
}
