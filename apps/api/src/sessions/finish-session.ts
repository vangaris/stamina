import { RecordStatus, type FinishSession, type FinishSessionResult } from '@stamina/contracts';
import { sessionLoad } from '@stamina/domain';
import { lockUser } from '../db/lock-user.ts';
import { sessionLog } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { RecordIdTakenError } from './record-id-taken-error.ts';
import { readSessionPlan } from './read-session-plan.ts';
import { toFinishedSession } from './to-finished-session.ts';

/**
 * Finishes the user's Session with its session RPE and stores the Load (`sessionLoad`: RPE x
 * minutes, the Session's planned minutes when none are given); `null` when the Session is not
 * the user's or does not exist; `RecordIdTakenError` when the finish id belongs to another Session. A Session finishes once: a second finish (the same id again or
 * another) changes nothing and returns the stored one with `recorded: false`. Runs under
 * `lockUser`, so two devices finishing at once store one record.
 */
export async function finishSession(
  db: Db,
  userId: string,
  sessionId: string,
  finish: FinishSession,
): Promise<FinishSessionResult | null> {
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);
    const plan = await readSessionPlan(tx, userId, sessionId);
    if (plan === null) return null;
    if (plan.finished !== null) {
      return { status: RecordStatus.Saved, recorded: false, finished: plan.finished };
    }

    const minutes = finish.minutes ?? plan.session.minutes;
    const [stored] = await tx
      .insert(sessionLog)
      .values({
        id: finish.id,
        userId,
        sessionId,
        rpe: finish.rpe,
        minutes,
        load: sessionLoad(finish.rpe, minutes),
      })
      .onConflictDoNothing()
      .returning();
    if (stored !== undefined) {
      return { status: RecordStatus.Saved, recorded: true, finished: toFinishedSession(stored) };
    }

    // The Session has no finish of its own (read under the lock), so the id belongs to another Session's.
    throw new RecordIdTakenError();
  });
}
