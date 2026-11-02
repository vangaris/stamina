import { FIELD_ID_PREFIX } from '../config.ts';
import type { ScreeningFieldKey } from '../types.ts';

/** Brings an answer's wrapper into the middle of the screen and moves focus to it. */
export function scrollToField(field: ScreeningFieldKey): void {
  const element = document.getElementById(`${FIELD_ID_PREFIX}${field}`);
  element?.scrollIntoView({ block: 'center' });
  element?.focus({ preventScroll: true });
}
