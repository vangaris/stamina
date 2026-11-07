import { describe, expect, it } from 'vitest';
import { computeLoadBarsScale } from './compute-load-bars-scale.ts';

describe('computeLoadBarsScale', () => {
  it('scales to the tallest done+planned stack', () => {
    const s = computeLoadBarsScale(
      [
        { done: 50, planned: 0 },
        { done: 40, planned: 60 },
      ],
      null,
    );
    expect(s.max).toBe(100);
    expect(s.bars).toEqual([
      { donePercent: 50, plannedPercent: 0 },
      { donePercent: 40, plannedPercent: 60 },
    ]);
    expect(s.averagePercent).toBeNull();
  });
  it('lets a taller average set the scale', () => {
    const s = computeLoadBarsScale([{ done: 50, planned: 0 }], 200);
    expect(s.max).toBe(200);
    expect(s.bars[0]?.donePercent).toBe(25);
    expect(s.averagePercent).toBe(100);
  });
  it('places the average inside the plot', () => {
    expect(computeLoadBarsScale([{ done: 100, planned: 0 }], 50).averagePercent).toBe(50);
  });
  it('keeps a defined scale when everything is zero or empty', () => {
    expect(computeLoadBarsScale([], null)).toEqual({ max: 1, bars: [], averagePercent: null });
    const s = computeLoadBarsScale([{ done: 0, planned: 0 }], 0);
    expect(s.bars[0]).toEqual({ donePercent: 0, plannedPercent: 0 });
    expect(s.averagePercent).toBe(0);
  });
  it('treats negative and non-finite values as zero, and a non-finite average as absent', () => {
    const s = computeLoadBarsScale(
      [
        { done: -5, planned: Number.NaN },
        { done: 10, planned: 0 },
      ],
      Number.NaN,
    );
    expect(s.bars[0]).toEqual({ donePercent: 0, plannedPercent: 0 });
    expect(s.averagePercent).toBeNull();
    expect(s.max).toBe(10);
  });
});
