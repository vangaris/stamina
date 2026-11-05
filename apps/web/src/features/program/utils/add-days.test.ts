import { describe, expect, it } from 'vitest';
import { addDays } from './add-days.ts';

describe('addDays', () => {
  it('moves within a month and across month and year ends', () => {
    expect(addDays('2026-11-05', 1)).toBe('2026-11-06');
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 6)).toBe('2027-01-06');
  });
});
