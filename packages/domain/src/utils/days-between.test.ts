import { describe, expect, it } from 'vitest';
import { daysBetween } from './days-between.ts';

describe('daysBetween', () => {
  it('counts calendar days forward, back and across a month end', () => {
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0);
    expect(daysBetween('2026-02-27', '2026-03-02')).toBe(3);
    expect(daysBetween('2026-03-02', '2026-02-27')).toBe(-3);
  });
});
