import { MIN_WEIGHT_KG } from '../config.ts';
import type { ExerciseView, SetDraft } from '../types.ts';

/**
 * What the steppers and chips start at for the next set. Weight: the last logged set's, else the
 * suggested one (not for a swapped exercise, which it was not made for), else none. Reps: the top
 * of the range. Effort: the last logged set's; the first set of an exercise starts unrated, so a
 * single tap never rates it (and never earns a heavier weight) on the person's behalf.
 */
export function defaultSetDraft({ exercise, swapped }: ExerciseView): SetDraft {
  const last = exercise.loggedSets.reduce<(typeof exercise.loggedSets)[number] | undefined>(
    (latest, set) => (latest && latest.setNumber > set.setNumber ? latest : set),
    undefined,
  );
  return {
    weightKg: last?.weightKg ?? (swapped ? undefined : exercise.suggestedWeightKg) ?? MIN_WEIGHT_KG,
    reps: exercise.repMax,
    rpe: last?.rpe,
  };
}
