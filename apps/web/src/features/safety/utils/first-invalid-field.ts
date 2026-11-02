import { FIELD_ORDER } from '../config.ts';
import type { ScreeningErrors, ScreeningFieldKey } from '../types.ts';

/** The first answer, in page order, that has a message beside it. */
export function firstInvalidField(errors: ScreeningErrors): ScreeningFieldKey | undefined {
  return FIELD_ORDER.find((field) => errors[field] !== undefined);
}
