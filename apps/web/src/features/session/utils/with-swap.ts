import type { SessionExercise } from '@stamina/contracts';
import type { Swaps } from '../types.ts';

/** The swaps with this exercise set to `exerciseId`; choosing the planned exercise again removes its swap. Returns a new record. */
export function withSwap(
  swaps: Swaps,
  exercise: Pick<SessionExercise, 'id' | 'exerciseId'>,
  exerciseId: string,
): Swaps {
  const others = Object.fromEntries(Object.entries(swaps).filter(([id]) => id !== exercise.id));
  return exerciseId === exercise.exerciseId ? others : { ...others, [exercise.id]: exerciseId };
}
