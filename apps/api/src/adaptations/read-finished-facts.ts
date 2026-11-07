import type { FinishedSessionFact } from '@stamina/domain';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { session, sessionExercise, sessionLog } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';

/**
 * Every Session the user finished, any week, oldest first: the day it was planned for, the session
 * RPE they gave and the lowest reps in reserve it prescribed (`null` when it rated no exercise).
 */
export async function readFinishedFacts(
  tx: UserTx,
  userId: string,
): Promise<FinishedSessionFact[]> {
  const finished = await tx
    .select({
      sessionId: sessionLog.sessionId,
      date: session.date,
      rpe: sessionLog.rpe,
      finishedAt: sessionLog.finishedAt,
    })
    .from(sessionLog)
    .innerJoin(session, eq(session.id, sessionLog.sessionId))
    .where(eq(sessionLog.userId, userId))
    .orderBy(asc(sessionLog.finishedAt), asc(sessionLog.id));
  if (finished.length === 0) return [];

  const lowest = await tx
    .select({
      sessionId: sessionExercise.sessionId,
      rir: sql<number | null>`min(${sessionExercise.rir})`,
    })
    .from(sessionExercise)
    .where(
      inArray(
        sessionExercise.sessionId,
        finished.map(({ sessionId }) => sessionId),
      ),
    )
    .groupBy(sessionExercise.sessionId);

  return finished.map(({ sessionId, date, rpe, finishedAt }) => ({
    date,
    rpe,
    lowestRir: lowest.find((row) => row.sessionId === sessionId)?.rir ?? null,
    finishedAt: finishedAt.toISOString(),
  }));
}
