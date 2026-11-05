import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { localizedName } from './localized-name.ts';

describe('localizedName', () => {
  it('uses the Greek name when there is one', () => {
    expect(localizedName({ name: { en: 'Squat', el: 'Καθίσματα' } }, Locale.El)).toBe('Καθίσματα');
  });

  it('falls back to English when the Greek name is null', () => {
    expect(localizedName({ name: { en: 'Squat', el: null } }, Locale.El)).toBe('Squat');
  });

  it('uses English for English', () => {
    expect(localizedName({ name: { en: 'Squat', el: 'Καθίσματα' } }, Locale.En)).toBe('Squat');
  });
});
