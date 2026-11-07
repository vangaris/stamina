import { RecordStatus, type FinishSession, type FinishSessionResult } from '@stamina/contracts';
import { sessionLoad } from '@stamina/domain';
import { lockUser } from '../db/lock-user.ts';
import { sessionLog } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { refreshAdaptations } from '../adaptations/index.ts';
import { RecordIdTakenError } from './record-id-taken-error.ts';
import { readSessionPlan } from './read-session-plan.ts';
import { resolveCurrentSessionId } from './resolve-current-session-id.ts';
import { toFinishedSession } from './to-finished-session.ts';

/**
 * Finishes the user's Session with its session RPE and stores the Load (`sessionLoad`: RPE x
 * minutes, the Session's planned minutes when none are given); `null` when the Session is not
 * the user's or does not exist. A revision that replaced the Session (an Adaptation was accepted)
 * is finished in its place: the id resolves to the current revision. `RecordIdTakenError` when the finish id belongs to another Session. A Session finishes once: a second finish (the same id again or
 * another) changes nothing and returns the stored one with `recorded: false`. Runs under
 * `lockUser`, so two devices finishing at once store one record. A new finish runs the Adaptation
 * rules at `now` in the same transaction (`refreshAdaptations`), so two hard Sessions in a row can
 * raise a Deload at once.
 */
export async function finishSession(
  db: Db,
  userId: string,
  sessionId: string,
  finish: FinishSession,
  now: Date,
): Promise<FinishSessionResult | null> {
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);
    const current = await resolveCurrentSessionId(tx, sessionId);
    const plan = await readSessionPlan(tx, userId, current);
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
        sessionId: current,
        rpe: finish.rpe,
        minutes,
        load: sessionLoad(finish.rpe, minutes),
      })
      .onConflictDoNothing()
      .returning();
    if (stored !== undefined) {
      await refreshAdaptations(tx, userId, now);
      return { status: RecordStatus.Saved, recorded: true, finished: toFinishedSession(stored) };
    }

    // The Session has no finish of its own (read under the lock), so the id belongs to another Session's.
    throw new RecordIdTakenError();
  });
}
