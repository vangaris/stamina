import { LIMITED_EXCLUDED_PATTERNS, MAIN_STRENGTH_PATTERNS } from '../config.ts';
import { SessionFocus } from '../enums/session-focus.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import type { PickExercisesInput, PlannableExercise } from '../types.ts';
import { selectExercises } from './select-exercises.ts';

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
