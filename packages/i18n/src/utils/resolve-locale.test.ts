import { describe, expect, it } from 'vitest';
import { resolveLocale } from './resolve-locale.ts';

describe('resolveLocale', () => {
  it('maps the first supported language of the phone, ignoring region', () => {
    expect(resolveLocale(['de-DE', 'el-GR', 'en-US'])).toBe('el');
    expect(resolveLocale(['EL'])).toBe('el');
  });

  it('falls back to English', () => {
    expect(resolveLocale(['fr-FR'])).toBe('en');
    expect(resolveLocale([])).toBe('en');
  });
});
