import type { LogSet, SessionDetail } from '@stamina/contracts';

/** The Session with `set` added to the exercise (by the Session exercise's id), in set order. Returns a new object. */
export function addLoggedSet(
  detail: SessionDetail,
  sessionExerciseId: string,
  set: LogSet,
): SessionDetail {
  return {
    ...detail,
    exercises: detail.exercises.map((exercise) =>
      exercise.id === sessionExerciseId
        ? {
            ...exercise,
            loggedSets: [...exercise.loggedSets, set].sort((a, b) => a.setNumber - b.setNumber),
          }
        : exercise,
    ),
  };
}
