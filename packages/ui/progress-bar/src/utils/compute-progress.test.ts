import { describe, expect, it } from 'vitest';
import { computeProgress } from './compute-progress.ts';

describe('computeProgress', () => {
  it('maps a value inside the range', () => {
    expect(computeProgress(5, 0, 20)).toEqual({ min: 0, max: 20, now: 5, percent: 25 });
  });
  it('clamps below min and above max', () => {
    expect(computeProgress(-5, 10, 20).now).toBe(10);
    expect(computeProgress(-5, 10, 20).percent).toBe(0);
    expect(computeProgress(120, 0, 100).now).toBe(100);
    expect(computeProgress(120, 0, 100).percent).toBe(100);
  });
  it('treats a non-finite value as min', () => {
    for (const v of [NaN, Infinity, -Infinity]) {
      expect(computeProgress(v, 10, 20)).toMatchObject({ now: 10, percent: 0 });
    }
  });
  it('falls back to 0-100 for an unusable range', () => {
    expect(computeProgress(50, 10, 10)).toMatchObject({ min: 0, max: 100, now: 50 });
    expect(computeProgress(50, 20, 10)).toMatchObject({ min: 0, max: 100 });
    expect(computeProgress(50, 0, NaN)).toMatchObject({ min: 0, max: 100 });
    expect(computeProgress(50, 0, Infinity)).toMatchObject({ min: 0, max: 100 });
  });
  it('uses 0 for a non-finite min but keeps a valid max', () => {
    expect(computeProgress(5, NaN, 10)).toMatchObject({ min: 0, max: 10, now: 5, percent: 50 });
  });
  it('supports negative ranges', () => {
    expect(computeProgress(0, -10, 10).percent).toBe(50);
  });
});
