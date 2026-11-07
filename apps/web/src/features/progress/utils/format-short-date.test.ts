import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { formatShortDate } from './format-short-date.ts';

describe('formatShortDate', () => {
  it('writes a short month and a day in English', () => {
    expect(formatShortDate('2026-10-12', Locale.En)).toBe('Oct 12');
  });

  it('writes it in Greek', () => {
    expect(formatShortDate('2026-10-12', Locale.El)).toMatch(/^12 Οκτ/);
  });

  it('does not move the day with the time zone', () => {
    expect(formatShortDate('2026-01-01', Locale.En)).toBe('Jan 1');
  });
});
