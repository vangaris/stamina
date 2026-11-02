import { COUNTRY_CODES } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { countryOptions } from './country-options.ts';

describe('countryOptions', () => {
  it('offers every country code exactly once', () => {
    const values = countryOptions(Locale.En).map((option) => option.value);

    expect(new Set(values).size).toBe(COUNTRY_CODES.length);
    expect(values).toContain('GR');
    expect(values).toContain('US');
  });

  it('names countries in the given language', () => {
    const label = (locale: Locale, code: string) =>
      countryOptions(locale).find((option) => option.value === code)?.label;

    expect(label(Locale.En, 'GR')).toBe('Greece');
    expect(label(Locale.El, 'GR')).toBe('Ελλάδα');
  });

  it('sorts by the name in that language, not by code', () => {
    const labels = countryOptions(Locale.En).map((option) => option.label);

    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, Locale.En)));
    expect(labels.indexOf('Austria')).toBeLessThan(labels.indexOf('Germany'));
  });
});
