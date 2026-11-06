import { LIMITED_SLOTS, RECOVERY_SLOTS, SLOT_ORDER } from '../config.ts';
import { SessionFocus } from '../enums/session-focus.ts';
import type { SessionSlot } from '../enums/session-slot.ts';
import type { PickExercisesInput } from '../types.ts';

/** The slots a Session of this focus has, in the order they are done. */
export function slotsOf({
  focus,
  limited,
}: Pick<PickExercisesInput, 'focus' | 'limited'>): SessionSlot[] {
  return [
    ...(focus === SessionFocus.Recovery ? RECOVERY_SLOTS : limited ? LIMITED_SLOTS : SLOT_ORDER),
  ];
}
