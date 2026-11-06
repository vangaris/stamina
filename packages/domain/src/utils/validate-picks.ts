import { PickProblem } from '../enums/pick-problem.ts';
import type { PickedExercise, PickSpec, PickValidation } from '../types.ts';

/**
 * Checks exercises chosen for one Session against the spec they were chosen from: every pick is
 * a candidate of its own slot, every slot has exactly its count, and no exercise appears twice
 * in the Session. This is what keeps an excluded area or Limited mode safe whoever picked: a
 * pick outside the candidates is refused, never repaired. On success the picks come back in
 * the order the Session does them (slot order, then the picker's order within the slot).
 */
export function validatePicks(spec: PickSpec, picks: readonly PickedExercise[]): PickValidation {
  const bySlot = new Map(spec.slots.map((slot) => [slot.slot, slot]));
  const seen = new Set<string>();
  const taken = new Map<PickedExercise['slot'], number>();

  for (const pick of picks) {
    const slot = bySlot.get(pick.slot);
    if (slot === undefined || !slot.candidateIds.includes(pick.exerciseId)) {
      return { valid: false, problem: PickProblem.NotACandidate };
    }
    if (seen.has(pick.exerciseId)) return { valid: false, problem: PickProblem.Duplicate };
    seen.add(pick.exerciseId);
    taken.set(pick.slot, (taken.get(pick.slot) ?? 0) + 1);
  }
  for (const { slot, count } of spec.slots) {
    if ((taken.get(slot) ?? 0) !== count) return { valid: false, problem: PickProblem.WrongCount };
  }

  return {
    valid: true,
    picks: spec.slots.flatMap(({ slot }) => picks.filter((pick) => pick.slot === slot)),
  };
}
