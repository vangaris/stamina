import type { SessionExercise } from '@stamina/contracts';

/** The exercise ids a set for this Session exercise may carry: the planned one and its tagged variants. */
export function sessionExerciseIds(
  exercise: Pick<SessionExercise, 'exerciseId' | 'easier' | 'harder'>,
): string[] {
  return [exercise.exerciseId, exercise.easier?.exerciseId, exercise.harder?.exerciseId].filter(
    (id): id is string => id !== undefined,
  );
}
