import { describe, expect, it } from 'vitest';
import { makeSessionExercise } from '../testing/make-session-detail.ts';
import { findVariant } from './find-variant.ts';

describe('findVariant', () => {
  const exercise = makeSessionExercise();

  it('finds the easier and the harder variant by exercise id', () => {
    expect(findVariant(exercise, 'box-squat')).toBe(exercise.easier);
    expect(findVariant(exercise, 'front-squat')).toBe(exercise.harder);
  });

  it('finds nothing for the planned exercise, an unknown id or no id', () => {
    expect(findVariant(exercise, 'goblet-squat')).toBeUndefined();
    expect(findVariant(exercise, 'unknown')).toBeUndefined();
    expect(findVariant(exercise, undefined)).toBeUndefined();
  });

  it('finds nothing where the exercise has no variants', () => {
    expect(
      findVariant(makeSessionExercise({ easier: null, harder: null }), 'box-squat'),
    ).toBeUndefined();
  });
});
