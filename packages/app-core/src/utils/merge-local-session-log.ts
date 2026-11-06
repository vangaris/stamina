import type { LogSet, SessionDetail } from '@stamina/contracts';
import { sessionLoad } from '@stamina/domain';
import type { LocalSessionLog } from '../types.ts';
import { sessionExerciseIds } from './session-exercise-ids.ts';

/**
 * The server's Session plus what this device logged that the server does not show yet: a set
 * is added to the exercise it was done for (planned or variant) unless the server already has
 * that id or that set number for the exercise (the server's copy wins, as it does on replay);
 * the local finish stands in for `finished` until the server's arrives, with Load computed the
 * way the server does. Returns a new object; neither input changes.
 */
export function mergeLocalSessionLog(detail: SessionDetail, local: LocalSessionLog): SessionDetail {
  const serverIds = new Set(detail.exercises.flatMap((e) => e.loggedSets.map((set) => set.id)));
  const claimed = new Set<string>();

  const exercises = detail.exercises.map((exercise) => {
    const ids = sessionExerciseIds(exercise);
    const takenNumbers = new Set(exercise.loggedSets.map((set) => set.setNumber));
    const added: LogSet[] = [];
    for (const set of local.sets) {
      if (!ids.includes(set.exerciseId) || serverIds.has(set.id) || claimed.has(set.id)) continue;
      if (takenNumbers.has(set.setNumber)) continue;
      claimed.add(set.id);
      takenNumbers.add(set.setNumber);
      added.push(set);
    }
    if (added.length === 0) return exercise;
    const loggedSets = [...exercise.loggedSets, ...added].sort((a, b) => a.setNumber - b.setNumber);
    return { ...exercise, loggedSets };
  });

  if (detail.finished !== null || local.finish === null) return { ...detail, exercises };
  const { finish, recordedAt } = local.finish;
  const minutes = finish.minutes ?? detail.minutes;
  return {
    ...detail,
    exercises,
    finished: {
      id: finish.id,
      rpe: finish.rpe,
      minutes,
      load: sessionLoad(finish.rpe, minutes),
      finishedAt: recordedAt,
    },
  };
}
