import { describe, expect, it } from 'vitest';
import { boundState } from './bound-state.ts';

describe('boundState', () => {
  it('is at min on or below the min and at max on or above the max', () => {
    expect(boundState(0, 0, 10)).toEqual({ atMin: true, atMax: false });
    expect(boundState(-1, 0, 10)).toEqual({ atMin: true, atMax: false });
    expect(boundState(10, 0, 10)).toEqual({ atMin: false, atMax: true });
    expect(boundState(11, 0, 10)).toEqual({ atMin: false, atMax: true });
  });

  it('is at neither bound strictly between them', () => {
    expect(boundState(5, 0, 10)).toEqual({ atMin: false, atMax: false });
  });

  it('never reaches an omitted bound', () => {
    expect(boundState(-1e9, undefined, 10)).toEqual({ atMin: false, atMax: false });
    expect(boundState(1e9, 0)).toEqual({ atMin: false, atMax: false });
    expect(boundState(5)).toEqual({ atMin: false, atMax: false });
  });

  it('is at both bounds when min equals max', () => {
    expect(boundState(3, 3, 3)).toEqual({ atMin: true, atMax: true });
  });
});
