import { describe, expect, it } from 'vitest';
import { computeRing } from './compute-ring.ts';

describe('computeRing', () => {
  it('is full at the start and empty at the end', () => {
    const start = computeRing(90, 90);
    expect(start.fraction).toBe(1);
    expect(start.dashOffset).toBe(0);
    const end = computeRing(0, 90);
    expect(end.fraction).toBe(0);
    expect(end.dashOffset).toBeCloseTo(end.circumference);
  });

  it('paints the share still to go', () => {
    const half = computeRing(45, 90);
    expect(half.fraction).toBe(0.5);
    expect(half.dashOffset).toBeCloseTo(half.circumference / 2);
  });

  it('clamps when time was added beyond the total, or went negative', () => {
    expect(computeRing(120, 90).fraction).toBe(1);
    expect(computeRing(-5, 90).fraction).toBe(0);
  });

  it.each([
    [10, 0],
    [10, -1],
    [Number.NaN, 90],
    [10, Number.NaN],
    [Number.POSITIVE_INFINITY, 90],
  ])('paints nothing for remaining %s of total %s', (remaining, total) => {
    expect(computeRing(remaining, total).fraction).toBe(0);
  });
});
