import type { Locale } from '@stamina/i18n';

/** A Load the way the person's language writes it: "1,840" in English, "1.840" in Greek. */
export function formatLoad(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}
