import { describe, expect, it } from 'vitest';
import { minuteOfDay } from './minute-of-day.ts';

describe('minuteOfDay', () => {
  it("counts from the start of the person's day", () => {
    expect(minuteOfDay(new Date(2026, 10, 7, 0, 0))).toBe(0);
    expect(minuteOfDay(new Date(2026, 10, 7, 8, 30))).toBe(510);
    expect(minuteOfDay(new Date(2026, 10, 7, 23, 59))).toBe(1439);
  });
});
