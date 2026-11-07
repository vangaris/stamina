import { BLOCK_RIR_BY_WEEK, DELOAD_SET_FACTOR, DELOAD_WEEK_IN_BLOCK } from '../config.ts';
import type { GeneratedExercise } from '../types.ts';

/**
 * The Deload week's prescription for a Session's exercises: sets halved (rounded up, at least
 * one, never more than before) and rated exercises at least the Deload week's reps in reserve.
 */
export function deloadExercises(exercises: readonly GeneratedExercise[]): GeneratedExercise[] {
  const deloadRir = BLOCK_RIR_BY_WEEK[DELOAD_WEEK_IN_BLOCK - 1]!;
  return exercises.map((exercise) => ({
    ...exercise,
    sets: Math.min(exercise.sets, Math.max(1, Math.ceil(exercise.sets * DELOAD_SET_FACTOR))),
    rir: exercise.rir === null ? null : Math.max(exercise.rir, deloadRir),
  }));
}
