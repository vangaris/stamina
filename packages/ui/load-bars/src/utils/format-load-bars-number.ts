/** A Load the way the person's language writes it: "1,840" in English, "1.840" in Greek. */
export function formatLoadBarsNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}
