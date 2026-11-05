import { describe, expect, it } from 'vitest';
import { addDays } from './add-days.ts';

describe('addDays', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('knows leap days', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });
  it('goes back for a negative count', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
