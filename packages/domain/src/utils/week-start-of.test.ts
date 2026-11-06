import { describe, expect, it } from 'vitest';
import { weekStartOf } from './week-start-of.ts';

const ANCHOR = '2026-11-06';

describe('weekStartOf', () => {
  it('is the anchor for any day of the anchor week', () => {
    expect(weekStartOf(ANCHOR, '2026-11-06')).toBe('2026-11-06');
    expect(weekStartOf(ANCHOR, '2026-11-12')).toBe('2026-11-06');
  });

  it('steps by whole weeks forward', () => {
    expect(weekStartOf(ANCHOR, '2026-11-13')).toBe('2026-11-13');
    expect(weekStartOf(ANCHOR, '2026-12-01')).toBe('2026-11-27');
  });

  it('steps by whole weeks back, so the day before the anchor is the last day of the week before', () => {
    expect(weekStartOf(ANCHOR, '2026-11-05')).toBe('2026-10-30');
    expect(weekStartOf(ANCHOR, '2026-10-30')).toBe('2026-10-30');
    expect(weekStartOf(ANCHOR, '2026-10-29')).toBe('2026-10-23');
  });
});
