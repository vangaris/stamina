import type { PlannedExercise } from './types.ts';

/**
 * The Session exercise a set of `exerciseId` belongs to: the one planned with that exercise, else
 * the first (by position) whose tagged easier or harder variant it is. `undefined` when the
 * exercise is neither planned nor a variant of one.
 */
export function findPlannedExercise(
  exercises: readonly PlannedExercise[],
  exerciseId: string,
): PlannedExercise | undefined {
  return (
    exercises.find(({ row }) => row.exerciseId === exerciseId) ??
    exercises.find(
      ({ easier, harder }) =>
        easier?.exerciseId === exerciseId || harder?.exerciseId === exerciseId,
    )
  );
}
