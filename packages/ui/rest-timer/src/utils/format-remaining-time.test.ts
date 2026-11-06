import { describe, expect, it } from 'vitest';
import { formatRemainingTime } from './format-remaining-time.ts';

describe('formatRemainingTime', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [59, '0:59'],
    [60, '1:00'],
    [125, '2:05'],
    [600, '10:00'],
  ])('formats %i s as %s', (seconds, text) => {
    expect(formatRemainingTime(seconds)).toBe(text);
  });

  it('rounds fractions up so 0:00 only shows when over', () => {
    expect(formatRemainingTime(0.2)).toBe('0:01');
    expect(formatRemainingTime(59.5)).toBe('1:00');
  });

  it.each([-3, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'reads %s as 0:00',
    (seconds) => {
      expect(formatRemainingTime(seconds)).toBe('0:00');
    },
  );
});
