import { describe, expect, it } from 'vitest';
import { toLocalDate } from './to-local-date.ts';

describe('toLocalDate', () => {
  it('writes the local calendar day with zero padding', () => {
    expect(toLocalDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toLocalDate(new Date(2026, 10, 6, 0, 1))).toBe('2026-11-06');
  });
});
