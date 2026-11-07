import { RecordStatus, SessionRejection, type LogSet, type LogSetResult } from '@stamina/contracts';
import { and, eq } from 'drizzle-orm';
import { lockUser } from '../db/lock-user.ts';
import { setLog } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { findPlannedExercise } from './find-planned-exercise.ts';
import { RecordIdTakenError } from './record-id-taken-error.ts';
import { readSessionPlan } from './read-session-plan.ts';
import { resolveCurrentSessionId } from './resolve-current-session-id.ts';

const rejected = (reason: SessionRejection): LogSetResult => ({
  status: RecordStatus.Rejected,
  reason,
});

/**
 * Records one set of the user's Session, or says why not; `null` when the Session is not the
 * user's or does not exist. A revision that replaced the Session (an Adaptation was accepted)
 * takes the set: the id resolves to the current revision, so a set queued on a phone before the
 * plan changed still lands, and is `ExerciseNotInSession` only when the revision dropped the
 * exercise. Replays are safe: a set whose id the server holds for this Session, or
 * whose number is already logged for that Session exercise, changes nothing and answers `Saved`
 * with `recorded: false` (the first write wins), even after the Session is finished. A new set
 * after the finish is `SessionFinished`; a set id that belongs to another Session throws `RecordIdTakenError`; an exercise that is neither planned nor a tagged easier
 * or harder variant of a planned one is `ExerciseNotInSession`. Runs under `lockUser`, so a finish
 * and a set from two devices are ordered.
 */
export async function logSet(
  db: Db,
  userId: string,
  sessionId: string,
  set: LogSet,
): Promise<LogSetResult | null> {
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);
    const current = await resolveCurrentSessionId(tx, sessionId);
    const plan = await readSessionPlan(tx, userId, current);
    if (plan === null) return null;

    const [replay] = await tx
      .select({ id: setLog.id })
      .from(setLog)
      .where(and(eq(setLog.id, set.id), eq(setLog.sessionId, current)));
    if (replay !== undefined) return { status: RecordStatus.Saved, recorded: false };
    if (plan.finished !== null) return rejected(SessionRejection.SessionFinished);

    const planned = findPlannedExercise(plan.exercises, set.exerciseId);
    if (planned === undefined) return rejected(SessionRejection.ExerciseNotInSession);

    const inserted = await tx
      .insert(setLog)
      .values({
        id: set.id,
        userId,
        sessionId: current,
        sessionExerciseId: planned.row.id,
        exerciseId: set.exerciseId,
        setNumber: set.setNumber,
        weightKg: set.weightKg,
        reps: set.reps,
        rpe: set.rpe,
      })
      .onConflictDoNothing()
      .returning({ id: setLog.id });
    if (inserted.length > 0) return { status: RecordStatus.Saved, recorded: true };

    const [sameNumber] = await tx
      .select({ id: setLog.id })
      .from(setLog)
      .where(
        and(eq(setLog.sessionExerciseId, planned.row.id), eq(setLog.setNumber, set.setNumber)),
      );
    // Neither a replay of this id nor a repeated number: the id belongs to another Session's set.
    if (sameNumber === undefined) throw new RecordIdTakenError();
    return { status: RecordStatus.Saved, recorded: false };
  });
}
