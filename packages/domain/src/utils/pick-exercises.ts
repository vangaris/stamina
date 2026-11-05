import {
  LIMITED_EXCLUDED_PATTERNS,
  MAIN_STRENGTH_PATTERNS,
  RECOVERY_ACCESSORY_PATTERNS,
  SLOT_COUNTS_BY_MINUTES,
  SLOT_ORDER,
  SPORT_MOVEMENT_PATTERNS,
} from '../config.ts';
import type { MovementPattern } from '../enums/movement-pattern.ts';
import { SessionFocus } from '../enums/session-focus.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import type { PickedExercise, PickExercisesInput, PlannableExercise } from '../types.ts';
import { compareText } from './compare-text.ts';
import { selectExercises } from './select-exercises.ts';

/** The slots a Recovery Session has: no main strength, no sport support. */
const RECOVERY_SLOTS: readonly SessionSlot[] = [
  SessionSlot.WarmUp,
  SessionSlot.AccessoriesCore,
  SessionSlot.CoolDown,
];

/**
 * Fills every slot of one Session from the library, or returns `null` when the library cannot
 * (the caller refuses the Program: a half Session is never planned). The rules picker that the
 * AI picker falls back to. Deterministic: candidates are the exercises that pass the equipment
 * and excluded-area filter (`selectExercises`), ranked per slot, then by id.
 *
 * - Main strength: one exercise per distinct pattern of the focus (lower: squat, hinge, lunge;
 *   upper: push, pull, overhead) in that order, then more from any pattern of the focus.
 * - Sport support prefers the movement patterns the sport's key movements map to; accessories
 *   prefer exercises that load the sport's high-load areas.
 * - An exercise already planned earlier in the week is passed over while another candidate
 *   remains; one exercise appears at most once in a Session.
 * - A Recovery Session's accessories take core and mobility exercises first and any other
 *   accessory exercise only when those run out under the excluded areas.
 * - Limited mode drops jump-landing and change-of-direction exercises everywhere.
 */
export function pickExercises({
  library,
  equipment,
  excludedAreas,
  focus,
  minutes,
  limited,
  sport,
  usedInWeek,
}: PickExercisesInput): PickedExercise[] | null {
  const counts = SLOT_COUNTS_BY_MINUTES[minutes];
  if (counts === undefined) return null;

  const supportPatterns = new Set<MovementPattern>(
    (sport?.keyMovements ?? []).flatMap((movement) => SPORT_MOVEMENT_PATTERNS[movement]),
  );
  const sportAreas = sport?.highLoadAreas ?? [];
  const slots = focus === SessionFocus.Recovery ? RECOVERY_SLOTS : SLOT_ORDER;

  const inSession = new Set<string>();
  const picked: PickedExercise[] = [];

  for (const slot of slots) {
    const candidates = selectExercises(library, { equipment, slots: [slot], excludedAreas }).filter(
      (exercise) =>
        !inSession.has(exercise.id) &&
        !(limited && LIMITED_EXCLUDED_PATTERNS.includes(exercise.movementPattern)) &&
        fitsSlot(exercise, slot, focus),
    );
    /** Recovery accessories: core and mobility first, anything else that passes only after them. */
    const isFallback = (exercise: PlannableExercise): boolean =>
      slot === SessionSlot.AccessoriesCore &&
      focus === SessionFocus.Recovery &&
      !RECOVERY_ACCESSORY_PATTERNS.includes(exercise.movementPattern);
    const prefers = (exercise: PlannableExercise): boolean =>
      slot === SessionSlot.SportSupport
        ? supportPatterns.has(exercise.movementPattern)
        : slot === SessionSlot.AccessoriesCore
          ? exercise.highLoadAreas.some((area) => sportAreas.includes(area))
          : false;

    const chosen: PlannableExercise[] = [];
    const rank = (pool: readonly PlannableExercise[]): PlannableExercise[] =>
      pool
        .filter((exercise) => !chosen.includes(exercise))
        .map((exercise) => ({
          exercise,
          key: [
            isFallback(exercise) ? 1 : 0,
            usedInWeek.has(exercise.id) ? 1 : 0,
            prefers(exercise) ? 0 : 1,
            chosen.some((c) => c.movementPattern === exercise.movementPattern) ? 1 : 0,
          ],
        }))
        .sort(
          (a, b) =>
            a.key.reduce((diff, value, index) => diff || value - b.key[index]!, 0) ||
            compareText(a.exercise.id, b.exercise.id),
        )
        .map(({ exercise }) => exercise);

    if (slot === SessionSlot.MainStrength && focus !== SessionFocus.Recovery) {
      for (const pattern of MAIN_STRENGTH_PATTERNS[focus]) {
        if (chosen.length >= counts[slot]) break;
        const [best] = rank(candidates.filter((exercise) => exercise.movementPattern === pattern));
        if (best) chosen.push(best);
      }
    }
    while (chosen.length < counts[slot]) {
      const [best] = rank(candidates);
      if (!best) return null;
      chosen.push(best);
    }

    for (const exercise of chosen) {
      inSession.add(exercise.id);
      picked.push({ exerciseId: exercise.id, slot });
    }
  }
  return picked;
}

/** Whether an exercise suits a slot of a Session with this focus, beyond carrying the slot's tag. */
function fitsSlot(exercise: PlannableExercise, slot: SessionSlot, focus: SessionFocus): boolean {
  if (slot === SessionSlot.MainStrength && focus !== SessionFocus.Recovery) {
    return MAIN_STRENGTH_PATTERNS[focus].includes(exercise.movementPattern);
  }
  return true;
}
