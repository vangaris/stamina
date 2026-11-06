import type { SessionDetail } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { makeLoggedSet, makeSessionDetail } from '../testing/make-session-detail.ts';
import { buildExerciseViews } from './build-exercise-views.ts';
import { nextSetTarget } from './next-set-target.ts';

/** The standard Session (1, 3 and 2 planned sets) with this many sets logged on each exercise. */
function viewsWith(done: [number, number, number]) {
  const base = makeSessionDetail();
  const detail: SessionDetail = {
    ...base,
    exercises: base.exercises.map((exercise, index) => ({
      ...exercise,
      loggedSets: Array.from({ length: done[index] ?? 0 }, (_, set) =>
        makeLoggedSet({ setNumber: set + 1 }),
      ),
    })),
  };
  return buildExerciseViews(detail, {});
}

describe('nextSetTarget', () => {
  it('stays on the exercise while it has planned sets left', () => {
    expect(nextSetTarget(viewsWith([1, 1, 0]), 1)).toEqual({ position: 1, setNumber: 2 });
  });

  it('moves to the next exercise once the planned sets are done', () => {
    expect(nextSetTarget(viewsWith([1, 3, 0]), 1)).toEqual({ position: 2, setNumber: 1 });
  });

  it('goes back to an exercise that was skipped when nothing is left after it', () => {
    expect(nextSetTarget(viewsWith([0, 3, 2]), 2)).toEqual({ position: 0, setNumber: 1 });
  });

  it('is undefined when every planned set is logged, extra sets included', () => {
    expect(nextSetTarget(viewsWith([1, 4, 2]), 1)).toBeUndefined();
  });
});
