import { describe, expect, it } from 'vitest';
import { Weekday } from '../enums/weekday.ts';
import { weekdayOf } from './weekday-of.ts';

describe('weekdayOf', () => {
  it('reads the UTC weekday, Monday first', () => {
    expect(weekdayOf('2026-11-02')).toBe(Weekday.Mon);
    expect(weekdayOf('2026-11-06')).toBe(Weekday.Fri);
    expect(weekdayOf('2026-11-08')).toBe(Weekday.Sun);
  });
});
