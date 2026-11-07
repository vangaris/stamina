import type { AdaptationSession } from '@stamina/domain';
import { asc, inArray } from 'drizzle-orm';
import { sessionExercise, sessionLog, setLog } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import type { SessionRow } from '../program/index.ts';

/**
 * The given current Sessions as the Adaptation rules see them: their exercises in the order they
 * are done, whether each has a finish record and whether any set was logged in it, by date (ties by id).
 */
export async function readAdaptationSessions(
  tx: UserTx,
  rows: readonly SessionRow[],
): Promise<AdaptationSession[]> {
  const ids = rows.map(({ id }) => id);
  const exercises = await tx
    .select()
    .from(sessionExercise)
    .where(inArray(sessionExercise.sessionId, ids))
    .orderBy(asc(sessionExercise.position));
  const finished = new Set(
    (
      await tx
        .select({ sessionId: sessionLog.sessionId })
        .from(sessionLog)
        .where(inArray(sessionLog.sessionId, ids))
    ).map(({ sessionId }) => sessionId),
  );
  const started = new Set(
    (
      await tx
        .selectDistinct({ sessionId: setLog.sessionId })
        .from(setLog)
        .where(inArray(setLog.sessionId, ids))
    ).map(({ sessionId }) => sessionId),
  );

  return [...rows]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1))
    .map((row) => ({
      id: row.id,
      revision: row.revision,
      date: row.date,
      weekday: row.weekday,
      focus: row.focus,
      minutes: row.minutes,
      finished: finished.has(row.id),
      started: started.has(row.id) || finished.has(row.id),
      exercises: exercises
        .filter((exercise) => exercise.sessionId === row.id)
        .map((exercise) => ({
          exerciseId: exercise.exerciseId,
          slot: exercise.slot,
          sets: exercise.sets,
          repMin: exercise.repMin,
          repMax: exercise.repMax,
          unit: exercise.unit,
          rir: exercise.rir,
          loadGuidance: exercise.loadGuidance,
        })),
    }));
}
