import { MAX_SET_RPE, MIN_SET_RPE } from '@stamina/domain';
import type { ExerciseView, SetDraft } from '../types.ts';
import { targetRpe } from './target-rpe.ts';

/**
 * What the steppers and chips start at for the next set. Weight: the last logged set's, else the
 * suggested one (not for a swapped exercise, which it was not made for), else 0. Reps: the top
 * of the range. Effort: the last logged set's, else the target's, held inside what a set can be rated.
 */
export function defaultSetDraft({ exercise, swapped }: ExerciseView): SetDraft {
  const last = exercise.loggedSets.reduce<(typeof exercise.loggedSets)[number] | undefined>(
    (latest, set) => (latest && latest.setNumber > set.setNumber ? latest : set),
    undefined,
  );
  const target = exercise.rir === null ? MIN_SET_RPE : targetRpe(exercise.rir);
  return {
    weightKg: last?.weightKg ?? (swapped ? undefined : exercise.suggestedWeightKg) ?? 0,
    reps: exercise.repMax,
    rpe: last?.rpe ?? Math.min(MAX_SET_RPE, Math.max(MIN_SET_RPE, target)),
  };
}
