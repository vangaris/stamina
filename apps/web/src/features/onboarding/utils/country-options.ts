import { COUNTRY_CODES } from '@stamina/domain';
import type { Locale } from '@stamina/i18n';
import type { SelectOption } from '@stamina/ui-select';

/** Every country the domain knows, named in the given language and sorted by that name. */
export function countryOptions(locale: Locale): SelectOption[] {
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  return COUNTRY_CODES.map((code) => ({ value: code, label: names.of(code) ?? code })).sort(
    (a, b) => a.label.localeCompare(b.label, locale),
  );
}
