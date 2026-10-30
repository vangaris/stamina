import { describe, expect, it } from 'vitest';
import { countDecimals } from './count-decimals.ts';

describe('countDecimals', () => {
  it.each([
    [1, 0],
    [-12, 0],
    [0.5, 1],
    [-2.25, 2],
    [0.1 + 0.2, 17],
    [1e-7, 7],
    [1.5e-7, 8],
    [1e21, 0],
  ])('%s has %s decimals', (n, expected) => {
    expect(countDecimals(n)).toBe(expected);
  });

  it('is 0 for undefined and non-finite numbers', () => {
    expect(countDecimals(undefined)).toBe(0);
    expect(countDecimals(Infinity)).toBe(0);
    expect(countDecimals(NaN)).toBe(0);
  });
});
