import { describe, expect, it } from 'vitest';
import { withSwap } from './with-swap.ts';

const exercise = { id: 'row-1', exerciseId: 'goblet-squat' };

describe('withSwap', () => {
  it('records the variant for the exercise and keeps other swaps', () => {
    const swaps = Object.freeze({ other: 'plank' });

    expect(withSwap(swaps, exercise, 'box-squat')).toEqual({
      other: 'plank',
      'row-1': 'box-squat',
    });
  });

  it('replaces an earlier choice', () => {
    expect(withSwap({ 'row-1': 'box-squat' }, exercise, 'front-squat')).toEqual({
      'row-1': 'front-squat',
    });
  });

  it('drops the swap when the planned exercise is chosen again', () => {
    expect(withSwap({ 'row-1': 'box-squat', other: 'plank' }, exercise, 'goblet-squat')).toEqual({
      other: 'plank',
    });
  });
});
