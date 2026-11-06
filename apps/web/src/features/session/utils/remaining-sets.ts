import type { ExerciseView } from '../types.ts';

/** Planned sets not logged yet, across the whole Session; extra sets on one exercise do not cover another's. */
export function remainingSets(views: readonly ExerciseView[]): number {
  return views.reduce((sum, view) => sum + Math.max(0, view.exercise.sets - view.doneSets), 0);
}
