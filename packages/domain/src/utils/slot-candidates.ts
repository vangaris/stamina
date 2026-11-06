import {
  LIMITED_EXCLUDED_PATTERNS,
  LIMITED_SKIPPED_SLOT,
  LIMITED_SLOTS,
  MAIN_STRENGTH_PATTERNS,
  SLOT_COUNTS_BY_MINUTES,
  SLOT_ORDER,
} from '../config.ts';
import { SessionFocus } from '../enums/session-focus.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import type { PickExercisesInput, PlannableExercise } from '../types.ts';
import { selectExercises } from './select-exercises.ts';

/** The slots a Recovery Session has: no main strength, no sport support. */
const RECOVERY_SLOTS: readonly SessionSlot[] = [
  SessionSlot.WarmUp,
  SessionSlot.AccessoriesCore,
  SessionSlot.CoolDown,
];

type SlotInput = Pick<PickExercisesInput, 'focus' | 'limited' | 'minutes'>;

/** The slots a Session of this focus has, in the order they are done. */
export function slotsOf({ focus, limited }: Pick<SlotInput, 'focus' | 'limited'>): SessionSlot[] {
  return [
    ...(focus === SessionFocus.Recovery ? RECOVERY_SLOTS : limited ? LIMITED_SLOTS : SLOT_ORDER),
  ];
}

/**
 * How many exercises fill one slot, or `undefined` when no Session has this length. Limited mode
 * has no sport-support slot, so accessories-core takes its exercises and the length is still filled.
 */
export function slotCount(
  { focus, limited, minutes }: SlotInput,
  slot: SessionSlot,
): number | undefined {
  const counts = SLOT_COUNTS_BY_MINUTES[minutes];
  if (counts === undefined) return undefined;
  return limited && slot === SessionSlot.AccessoriesCore && focus !== SessionFocus.Recovery
    ? counts[slot] + counts[LIMITED_SKIPPED_SLOT]
    : counts[slot];
}

/**
 * The exercises that may fill one slot: those that pass the equipment and excluded-area filter
 * (`selectExercises`) and are not in `taken`; Limited mode never gets jump-landing or
 * change-of-direction work; a heavy main-strength slot takes only the focus's patterns. This is
 * the one candidate list both the rules picker and the AI picker draw from.
 */
export function slotCandidates(
  { library, equipment, excludedAreas, focus, limited }: PickExercisesInput,
  slot: SessionSlot,
  taken: ReadonlySet<string>,
): PlannableExercise[] {
  return selectExercises(library, { equipment, slots: [slot], excludedAreas }).filter(
    (exercise) =>
      !taken.has(exercise.id) &&
      !(limited && LIMITED_EXCLUDED_PATTERNS.includes(exercise.movementPattern)) &&
      fitsSlot(exercise, slot, focus),
  );
}

/** Whether an exercise suits a slot of a Session with this focus, beyond carrying the slot's tag. */
function fitsSlot(exercise: PlannableExercise, slot: SessionSlot, focus: SessionFocus): boolean {
  if (slot === SessionSlot.MainStrength && focus !== SessionFocus.Recovery) {
    return MAIN_STRENGTH_PATTERNS[focus].includes(exercise.movementPattern);
  }
  return true;
}
