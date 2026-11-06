import type { ExerciseView, SetTarget } from '../types.ts';
import { nextSetNumber } from './next-set-number.ts';

/**
 * Where the person goes after logging a set on `position`: the same exercise while it has planned
 * sets left, else the next exercise with sets left, else the earliest one skipped over. Undefined
 * when every planned set of the Session is logged.
 */
export function nextSetTarget(
  views: readonly ExerciseView[],
  position: number,
): SetTarget | undefined {
  const indices = views.map((_, index) => index);
  const order = [
    position,
    ...indices.filter((index) => index > position),
    ...indices.filter((index) => index < position),
  ];
  for (const index of order) {
    const view = views[index];
    if (view && view.doneSets < view.exercise.sets) {
      return { position: index, setNumber: nextSetNumber(view.exercise.loggedSets) };
    }
  }
  return undefined;
}
