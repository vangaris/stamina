import { IntlMessageFormat } from 'intl-messageformat';
import type { Locale } from '../enums/locale.ts';

const formatters = new Map<string, IntlMessageFormat>();

/** Formats an ICU message for a locale; plural, select and number rules follow that locale. */
export function formatMessage(
  locale: Locale,
  message: string,
  values?: Record<string, string | number | Date>,
): string {
  const cacheKey = `${locale}\u0000${message}`;
  let formatter = formatters.get(cacheKey);
  if (!formatter) {
    formatter = new IntlMessageFormat(message, locale);
    formatters.set(cacheKey, formatter);
  }
  return String(formatter.format(values));
}
