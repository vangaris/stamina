import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { formatTime } from './format-time.ts';

describe('formatTime', () => {
  it('writes a minute of the day as 24-hour time', () => {
    expect(formatTime(22 * 60 + 30, Locale.En)).toBe('22:30');
    expect(formatTime(7 * 60 + 5, Locale.En)).toBe('07:05');
  });

  it('writes the same clock time in Greek', () => {
    expect(formatTime(22 * 60 + 30, Locale.El)).toBe('22:30');
  });

  it('writes midnight as 00:00', () => {
    expect(formatTime(0, Locale.En)).toBe('00:00');
  });
});
