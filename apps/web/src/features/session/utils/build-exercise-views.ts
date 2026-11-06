import type { SessionDetail } from '@stamina/contracts';
import type { ExerciseView, Swaps } from '../types.ts';
import { findVariant } from './find-variant.ts';

/**
 * Every exercise of the Session in order, with this device's swaps applied. A swap whose variant
 * the exercise is no longer tagged with is ignored, so a stale choice can never log a stranger.
 */
export function buildExerciseViews(detail: SessionDetail, swaps: Swaps): ExerciseView[] {
  return detail.exercises.map((exercise) => {
    const variant = findVariant(exercise, swaps[exercise.id]);
    return {
      exercise,
      exerciseId: variant?.exerciseId ?? exercise.exerciseId,
      name: variant?.name ?? exercise.name,
      swapped: variant !== undefined,
      doneSets: exercise.loggedSets.length,
    };
  });
}
