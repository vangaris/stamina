import {
  RecordStatus,
  SessionRejection,
  type FinishedSession,
  type FinishSession,
  type FinishSessionResult,
  type LoggedSet,
  type LogSet,
  type LogSetResult,
  type ProgramSession,
  type SessionDetail,
} from '@stamina/contracts';
import { sessionLoad, type Emphasis } from '@stamina/domain';
import { buildFakeSessionDetail } from '../utils/build-fake-session-detail.ts';
import { sessionExerciseIds } from '../utils/session-exercise-ids.ts';

/** The Session the fake API call is about, and the key (user and Session) its sets and finish are kept under. */
export interface FakeSessionTarget {
  key: string;
  session: ProgramSession;
  emphasis: Emphasis;
}

/**
 * What the fake API remembers of sets and finishes, with the server's rules: a replay (the set's
 * id, or its number for the same exercise) or a second finish changes nothing and says
 * `recorded: false`; a new set after the finish is `SessionFinished`; an exercise that is neither
 * planned nor a tagged variant is `ExerciseNotInSession`. Load is RPE x minutes (planned minutes
 * when none are given).
 */
export function createFakeSessionLog() {
  const sets = new Map<string, LoggedSet[]>();
  const finishes = new Map<string, FinishedSession>();

  const read = ({ key, session, emphasis }: FakeSessionTarget): SessionDetail =>
    buildFakeSessionDetail(session, emphasis, sets.get(key) ?? [], finishes.get(key) ?? null);

  return {
    read,
    /** The finish of the Session kept under `key`, if any. */
    finished: (key: string): FinishedSession | undefined => finishes.get(key),
    /** Account deletion: everything kept for keys under this prefix (the user id and a colon). */
    forget(keyPrefix: string): void {
      for (const map of [sets, finishes]) {
        for (const key of map.keys()) if (key.startsWith(keyPrefix)) map.delete(key);
      }
    },
    logSet(target: FakeSessionTarget, set: LogSet): LogSetResult {
      const { key } = target;
      const stored = sets.get(key) ?? [];
      if (stored.some(({ id }) => id === set.id)) {
        return { status: RecordStatus.Saved, recorded: false };
      }
      if (finishes.has(key)) {
        return { status: RecordStatus.Rejected, reason: SessionRejection.SessionFinished };
      }
      const planned = read(target).exercises.find((exercise) =>
        sessionExerciseIds(exercise).includes(set.exerciseId),
      );
      if (!planned) {
        return { status: RecordStatus.Rejected, reason: SessionRejection.ExerciseNotInSession };
      }
      if (planned.loggedSets.some(({ setNumber }) => setNumber === set.setNumber)) {
        return { status: RecordStatus.Saved, recorded: false };
      }
      sets.set(key, [...stored, set]);
      return { status: RecordStatus.Saved, recorded: true };
    },
    finish({ key, session }: FakeSessionTarget, finish: FinishSession): FinishSessionResult {
      const existing = finishes.get(key);
      if (existing) return { status: RecordStatus.Saved, recorded: false, finished: existing };
      const minutes = finish.minutes ?? session.minutes;
      const finished: FinishedSession = {
        id: finish.id,
        rpe: finish.rpe,
        minutes,
        load: sessionLoad(finish.rpe, minutes),
        finishedAt: new Date().toISOString(),
      };
      finishes.set(key, finished);
      return { status: RecordStatus.Saved, recorded: true, finished };
    },
  };
}
