import { LoadGuidance, ProgressionOutcome } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { LoadMessageKey } from '../../program/index.ts';
import { TargetMessageKey } from '../enums/target-message-key.ts';
import { makeSessionExercise } from '../testing/make-session-detail.ts';
import type { ExerciseView } from '../types.ts';
import { toTargetView } from './to-target-view.ts';

const format = (value: number) => `<${value}>`;

function viewOf(
  overrides: Parameters<typeof makeSessionExercise>[0] = {},
  swapped = false,
): ExerciseView {
  const exercise = makeSessionExercise(overrides);
  return { exercise, exerciseId: exercise.exerciseId, name: exercise.name, swapped, doneSets: 0 };
}

describe('toTargetView', () => {
  it('reads the prescription and the effort to stop at', () => {
    const target = toTargetView(viewOf({ sets: 4, repMin: 4, repMax: 6, rir: 3 }), format);

    expect(target.prescription).toEqual({
      key: TargetMessageKey.Reps,
      params: { sets: 4, range: '4-6' },
    });
    expect(target.effort).toEqual({ key: TargetMessageKey.Effort, params: { rir: 3, rpe: 7 } });
  });

  it('has no effort line where effort is not rated', () => {
    expect(toTargetView(viewOf({ rir: null }), format).effort).toBeUndefined();
  });

  it.each([
    [ProgressionOutcome.Increase, TargetMessageKey.SuggestedIncrease],
    [ProgressionOutcome.Decrease, TargetMessageKey.SuggestedDecrease],
    [ProgressionOutcome.Hold, TargetMessageKey.SuggestedHold],
    [null, TargetMessageKey.SuggestedStart],
  ])('words a suggested weight reached by %s', (progression, key) => {
    const target = toTargetView(viewOf({ suggestedWeightKg: 42.5, progression }), format);

    expect(target.weight).toEqual({ key, params: { weight: '<42.5>' } });
  });

  it('falls back to how to find a weight without a suggestion', () => {
    expect(toTargetView(viewOf(), format).weight).toEqual({
      key: LoadMessageKey.RpeGuided,
      params: { rir: 3 },
    });
    expect(
      toTargetView(viewOf({ loadGuidance: LoadGuidance.Bodyweight }), format).weight?.key,
    ).toBe(LoadMessageKey.Bodyweight);
    expect(
      toTargetView(viewOf({ loadGuidance: LoadGuidance.None, rir: null }), format).weight,
    ).toBeUndefined();
  });

  it('does not carry the planned exercise suggestion over to a swapped one', () => {
    const target = toTargetView(viewOf({ suggestedWeightKg: 42.5 }, true), format);

    expect(target.weight?.key).toBe(LoadMessageKey.RpeGuided);
  });
});
