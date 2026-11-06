import { describe, expect, it } from 'vitest';
import { makeLoggedSet, makeSessionExercise } from '../testing/make-session-detail.ts';
import type { ExerciseView } from '../types.ts';
import { defaultSetDraft } from './default-set-draft.ts';

function viewOf(
  overrides: Parameters<typeof makeSessionExercise>[0] = {},
  swapped = false,
): ExerciseView {
  const exercise = makeSessionExercise(overrides);
  return {
    exercise,
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    swapped,
    doneSets: exercise.loggedSets.length,
  };
}

describe('defaultSetDraft', () => {
  it('starts at the suggested weight, the top of the range and the target effort', () => {
    expect(defaultSetDraft(viewOf({ suggestedWeightKg: 42.5, repMax: 6, rir: 3 }))).toEqual({
      weightKg: 42.5,
      reps: 6,
      rpe: 7,
    });
  });

  it('starts at 0 kg without a suggestion, and at the lightest rating without a target effort', () => {
    expect(defaultSetDraft(viewOf({ rir: null }))).toMatchObject({ weightKg: 0, rpe: 6 });
  });

  it('holds the target effort inside what a set can be rated', () => {
    expect(defaultSetDraft(viewOf({ rir: 5 })).rpe).toBe(6);
    expect(defaultSetDraft(viewOf({ rir: 0 })).rpe).toBe(10);
  });

  it('prefers the last logged set to the suggestion, whatever order the sets come in', () => {
    const draft = defaultSetDraft(
      viewOf({
        suggestedWeightKg: 40,
        loggedSets: [
          makeLoggedSet({ setNumber: 2, weightKg: 45, rpe: 9 }),
          makeLoggedSet({ setNumber: 1, weightKg: 40, rpe: 7 }),
        ],
      }),
    );

    expect(draft).toMatchObject({ weightKg: 45, rpe: 9 });
  });

  it('does not offer the planned exercise suggestion for a swapped one', () => {
    expect(defaultSetDraft(viewOf({ suggestedWeightKg: 40 }, true)).weightKg).toBe(0);
  });
});
