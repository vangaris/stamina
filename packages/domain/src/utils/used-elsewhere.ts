import type { AdaptationContext, AdaptationSession } from '../types.ts';

/** The exercise ids of the week's other current Sessions: a replacement prefers exercises not in this set. */
export function usedElsewhere(
  { sessions }: AdaptationContext,
  session: AdaptationSession,
): Set<string> {
  return new Set(
    sessions
      .filter((other) => other.id !== session.id)
      .flatMap((other) => other.exercises.map((exercise) => exercise.exerciseId)),
  );
}
