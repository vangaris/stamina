import { LIMITED_SKIPPED_SLOT, SLOT_COUNTS_BY_MINUTES } from '../config.ts';
import { SessionFocus } from '../enums/session-focus.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import type { PickExercisesInput } from '../types.ts';

/**
 * How many exercises fill one slot, or `undefined` when no Session has this length. Limited mode
 * has no sport-support slot, so accessories-core takes its exercises and the length is still filled.
 */
export function slotCount(
  { focus, limited, minutes }: Pick<PickExercisesInput, 'focus' | 'limited' | 'minutes'>,
  slot: SessionSlot,
): number | undefined {
  const counts = SLOT_COUNTS_BY_MINUTES[minutes];
  if (counts === undefined) return undefined;
  return limited && slot === SessionSlot.AccessoriesCore && focus !== SessionFocus.Recovery
    ? counts[slot] + counts[LIMITED_SKIPPED_SLOT]
    : counts[slot];
}
