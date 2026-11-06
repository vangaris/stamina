import type { StepperFormat } from '@stamina/ui-stepper';
import type { Locale } from '@stamina/i18n';
import { WEIGHT_FORMAT } from '../config.ts';

/** Formats a number the way the person's language writes it: "42.5" in English, "42,5" in Greek. */
export function createNumberFormat(locale: Locale): StepperFormat {
  const format = new Intl.NumberFormat(locale, WEIGHT_FORMAT);
  return (value) => format.format(value);
}
