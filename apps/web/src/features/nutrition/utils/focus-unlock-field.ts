import type { UnlockField } from '../enums/unlock-field.ts';

/** The id the Unlock Meals form gives an input, or the wrapper of a group of chips. */
export function unlockFieldId(field: UnlockField): string {
  return `unlock-field-${field}`;
}

/** The id of the input a dislike is typed in. */
export const DISLIKE_INPUT_ID = 'unlock-dislike-input';

/** Moves focus to the element with this id, or to the chip in the tab order when it wraps chips. */
export function focusById(id: string, doc: Document | undefined = globalThis.document): void {
  const target = doc?.getElementById(id);
  if (!target) return;
  const chip =
    target.querySelector<HTMLElement>('[role="radio"][tabindex="0"]') ??
    target.querySelector<HTMLElement>('[role="radio"]');
  (chip ?? target).focus();
}

/** Moves focus to an input of the form, so a failed submit lands on what needs an answer. */
export function focusUnlockField(
  field: UnlockField,
  doc: Document | undefined = globalThis.document,
): void {
  focusById(unlockFieldId(field), doc);
}
