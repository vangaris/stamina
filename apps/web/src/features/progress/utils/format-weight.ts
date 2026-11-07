import type { Locale } from '@stamina/i18n';
import { WEIGHT_FRACTION_DIGITS } from '../config.ts';

/** A weight in kilograms the way the person's language writes it: "72.5" in English, "72,5" in Greek. */
export function formatWeight(weightKg: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: WEIGHT_FRACTION_DIGITS }).format(
    weightKg,
  );
}
