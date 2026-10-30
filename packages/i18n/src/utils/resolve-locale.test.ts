import { describe, expect, it } from 'vitest';
import { Locale } from '../enums/locale.ts';
import { resolveLocale } from './resolve-locale.ts';

describe('resolveLocale', () => {
  it('maps the first supported language of the phone, ignoring region', () => {
    expect(resolveLocale(['de-DE', 'el-GR', 'en-US'])).toBe(Locale.El);
    expect(resolveLocale(['EL'])).toBe(Locale.El);
  });

  it('falls back to English', () => {
    expect(resolveLocale(['fr-FR'])).toBe(Locale.En);
    expect(resolveLocale([])).toBe(Locale.En);
  });
});
