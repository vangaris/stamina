import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { formatNumber } from './format-number.ts';

describe('formatNumber', () => {
  it('groups thousands in English', () => {
    expect(formatNumber(2150, Locale.En)).toBe('2,150');
  });

  it('writes a number without a fraction', () => {
    expect(formatNumber(1999.6, Locale.En)).toBe('2,000');
  });

  it('writes the Greek number format', () => {
    expect(formatNumber(2150, Locale.El)).toBe('2.150');
  });
});
