import type { SessionExercise } from '@stamina/contracts';
import type { ExerciseVariant } from '../types.ts';

/** The exercise's tagged easier or harder variant with this id; undefined for any other id, the planned exercise's own included. */
export function findVariant(
  exercise: SessionExercise,
  exerciseId: string | undefined,
): ExerciseVariant | undefined {
  if (exerciseId === undefined) return undefined;
  return (
    [exercise.easier, exercise.harder].find((variant) => variant?.exerciseId === exerciseId) ??
    undefined
  );
}
