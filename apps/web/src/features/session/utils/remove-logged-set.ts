import type { SessionDetail } from '@stamina/contracts';

/** The Session without the set with this id, wherever it was logged. Returns a new object. */
export function removeLoggedSet(detail: SessionDetail, setId: string): SessionDetail {
  return {
    ...detail,
    exercises: detail.exercises.map((exercise) => ({
      ...exercise,
      loggedSets: exercise.loggedSets.filter((set) => set.id !== setId),
    })),
  };
}
