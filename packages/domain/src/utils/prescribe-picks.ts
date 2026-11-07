import type {
  AdaptationContext,
  AdaptationSession,
  GeneratedExercise,
  PickedExercise,
} from '../types.ts';
import { fallbackRir } from './fallback-rir.ts';
import { swapPrescription } from './swap-prescription.ts';

/**
 * A Session's new picks as exercises. An exercise already in the Session in the same slot keeps its
 * prescription; a new one takes the prescription of the Session's exercise in the same slot (the
 * nth new one of a slot the nth of that slot, the last when there are fewer), so no pick ever has
 * more sets or fewer reps in reserve than what it stands in for. `null` when the Session has no
 * exercise in a slot to copy from (the picks do not fit this Session's shape).
 */
export function prescribePicks(
  context: AdaptationContext,
  session: AdaptationSession,
  picks: readonly PickedExercise[],
): GeneratedExercise[] | null {
  const library = new Map(context.generation.library.map((exercise) => [exercise.id, exercise]));
  const fallback = fallbackRir(context, session);
  const newPerSlot = new Map<string, number>();
  const result: GeneratedExercise[] = [];
  for (const { exerciseId, slot } of picks) {
    const kept = session.exercises.find(
      (exercise) => exercise.exerciseId === exerciseId && exercise.slot === slot,
    );
    if (kept) {
      result.push(kept);
      continue;
    }
    const sameSlot = session.exercises.filter((exercise) => exercise.slot === slot);
    const exercise = library.get(exerciseId);
    if (sameSlot.length === 0 || exercise === undefined) return null;
    const index = newPerSlot.get(slot) ?? 0;
    newPerSlot.set(slot, index + 1);
    const template = sameSlot[Math.min(index, sameSlot.length - 1)]!;
    result.push({ exerciseId, slot, ...swapPrescription(template, exercise, fallback) });
  }
  return result;
}
