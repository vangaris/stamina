import type { PickExercisesInput, PickSpec } from '../types.ts';
import { slotCandidates, slotCount, slotsOf } from './slot-candidates.ts';

/**
 * The candidate list a picker (the AI) fills one Session from, or `null` when no Session of
 * this length exists or a slot has fewer candidates than it needs (the same cases where the
 * rules picker refuses, so the caller falls back to it). Candidates are the exercises that pass
 * the equipment and excluded-area filter and the slot's own rules (`slotCandidates`), in library
 * order. Everything an excluded area or Limited mode forbids is already gone, so a picker needs
 * to know nothing about either.
 */
export function buildPickSpec(input: PickExercisesInput): PickSpec | null {
  const none: ReadonlySet<string> = new Set();
  const slots = [];
  const candidateIdsInSession = new Set<string>();
  for (const slot of slotsOf(input)) {
    const count = slotCount(input, slot);
    if (count === undefined) return null;
    const candidateIds = slotCandidates(input, slot, none).map((exercise) => exercise.id);
    if (candidateIds.length < count) return null;
    for (const id of candidateIds) candidateIdsInSession.add(id);
    slots.push({ slot, count, candidateIds });
  }
  return {
    slots,
    recentIds: [...candidateIdsInSession].filter((id) => input.usedInWeek.has(id)),
  };
}
