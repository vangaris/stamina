import type { SessionDetail } from '@stamina/contracts';
import { SessionStatus } from '@stamina/domain';
import { SessionProgress } from '../enums/session-progress.ts';

/**
 * Where a Session stands: done once the Program says so or the Session shows a finish (a finish
 * made offline is on the device before the Program hears of it), in progress once any set is
 * logged, else not started. `detail` is the prefetched Session, absent while there is none.
 */
export function toSessionProgress(
  status: SessionStatus,
  detail: SessionDetail | undefined,
): SessionProgress {
  if (status === SessionStatus.Completed || detail?.finished) return SessionProgress.Done;
  if (detail?.exercises.some((exercise) => exercise.loggedSets.length > 0)) {
    return SessionProgress.InProgress;
  }
  return SessionProgress.NotStarted;
}
