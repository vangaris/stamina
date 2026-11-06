import { describe, expect, it } from 'vitest';
import { SetDotState } from '../enums/set-dot-state.ts';
import { computeDotStates } from './compute-dot-states.ts';

const { Done, Current, Pending } = SetDotState;

describe('computeDotStates', () => {
  it('fills the logged sets and leaves the rest pending', () => {
    expect(computeDotStates(4, 2)).toEqual([Done, Done, Pending, Pending]);
  });

  it('marks the current set', () => {
    expect(computeDotStates(4, 1, 1)).toEqual([Done, Current, Pending, Pending]);
  });

  it('lets done win over current', () => {
    expect(computeDotStates(3, 2, 0)).toEqual([Done, Done, Pending]);
  });

  it('ignores a current index outside the sets', () => {
    expect(computeDotStates(2, 0, 5)).toEqual([Pending, Pending]);
    expect(computeDotStates(2, 0, -1)).toEqual([Pending, Pending]);
  });

  it('handles none and all done', () => {
    expect(computeDotStates(3, 0)).toEqual([Pending, Pending, Pending]);
    expect(computeDotStates(3, 3)).toEqual([Done, Done, Done]);
  });

  it('clamps done to the total and at zero', () => {
    expect(computeDotStates(2, 9)).toEqual([Done, Done]);
    expect(computeDotStates(2, -3)).toEqual([Pending, Pending]);
  });

  it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])('shows no dots for total %s', (total) => {
    expect(computeDotStates(total, 1)).toEqual([]);
  });

  it('treats a non-finite done as none and floors fractions', () => {
    expect(computeDotStates(2, Number.NaN)).toEqual([Pending, Pending]);
    expect(computeDotStates(3, 1.9)).toEqual([Done, Pending, Pending]);
  });
});
