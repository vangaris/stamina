import type { Locale } from '@stamina/i18n';

/** A whole number the way the person's language writes it: "2,150" in English, "2.150" in Greek. */
export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}
