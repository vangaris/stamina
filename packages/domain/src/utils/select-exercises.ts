import type { ExerciseFilter, ExerciseTags } from '../types.ts';

/**
 * The exercises that pass a filter, in their original order. This is the one place that decides
 * what may reach a person: an exercise loading an excluded body area never passes, whatever
 * else matches. The generation engine uses it to build the candidate list the AI picks from.
 */
export function selectExercises<T extends ExerciseTags>(
  exercises: readonly T[],
  { equipment, locations, slots, excludedAreas }: ExerciseFilter,
): T[] {
  return exercises.filter(
    (exercise) =>
      (equipment === undefined ||
        exercise.equipment.every((needed) => equipment.includes(needed))) &&
      (locations === undefined || exercise.locations.some((place) => locations.includes(place))) &&
      (slots === undefined || exercise.slots.some((slot) => slots.includes(slot))) &&
      (excludedAreas === undefined ||
        !exercise.highLoadAreas.some((area) => excludedAreas.includes(area))),
  );
}
