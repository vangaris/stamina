import { describe, expect, it } from 'vitest';
import { makeLoggedSet, makeSessionDetail } from '../testing/make-session-detail.ts';
import { buildExerciseViews } from './build-exercise-views.ts';
import { remainingSets } from './remaining-sets.ts';

describe('remainingSets', () => {
  it('counts the planned sets still to do, never below zero for an exercise', () => {
    const base = makeSessionDetail();
    const four = Array.from({ length: 4 }, (_, index) => makeLoggedSet({ setNumber: index + 1 }));
    const views = buildExerciseViews(
      {
        ...base,
        exercises: [
          base.exercises[0]!,
          { ...base.exercises[1]!, loggedSets: four },
          base.exercises[2]!,
        ],
      },
      {},
    );

    // 1 warm-up set + 0 (3 planned, 4 logged) + 2 plank sets
    expect(remainingSets(views)).toBe(3);
  });
});
