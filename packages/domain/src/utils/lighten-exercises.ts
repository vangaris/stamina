import { LIGHTER_RIR_STEP, LIGHTER_SETS_STEP, MAX_RIR } from '../config.ts';
import type { GeneratedExercise } from '../types.ts';

/**
 * The exercises one rep further from failure (never past `MAX_RIR`, rated exercises only) and
 * one set fewer (never below one), or `null` when that changes nothing.
 */
export function lightenExercises(
  exercises: readonly GeneratedExercise[],
): GeneratedExercise[] | null {
  const lighter = exercises.map((exercise) => ({
    ...exercise,
    sets: Math.max(1, exercise.sets - LIGHTER_SETS_STEP),
    rir: exercise.rir === null ? null : Math.min(MAX_RIR, exercise.rir + LIGHTER_RIR_STEP),
  }));
  const changed = lighter.some(
    (exercise, index) =>
      exercise.sets !== exercises[index]!.sets || exercise.rir !== exercises[index]!.rir,
  );
  return changed ? lighter : null;
}
