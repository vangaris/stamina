import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { formatWeight } from './format-weight.ts';

describe('formatWeight', () => {
  it('writes a decimal point in English and a comma in Greek', () => {
    expect(formatWeight(72.5, Locale.En)).toBe('72.5');
    expect(formatWeight(72.5, Locale.El)).toBe('72,5');
  });

  it('writes a whole weight without decimals', () => {
    expect(formatWeight(80, Locale.En)).toBe('80');
  });

  it('keeps two decimals', () => {
    expect(formatWeight(72.25, Locale.En)).toBe('72.25');
  });
});
