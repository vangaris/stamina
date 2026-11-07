import type { GeneratedExercise } from '../types.ts';

/** One set fewer for every exercise that has more than one, or `null` when none has. */
export function dropSets(exercises: readonly GeneratedExercise[]): GeneratedExercise[] | null {
  if (!exercises.some((exercise) => exercise.sets > 1)) return null;
  return exercises.map((exercise) => ({
    ...exercise,
    sets: Math.max(1, exercise.sets - 1),
  }));
}
