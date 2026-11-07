import type { ProgressSession } from '@stamina/domain';
import { and, eq, notExists } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { session, sessionLog } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';

/**
 * Every Session the user has, current rows only (the ones no revision replaces), each with
 * whether it was finished. Reads as the app role, so row-level security keeps it to the user's own.
 */
export async function readPlannedSessions(tx: UserTx, userId: string): Promise<ProgressSession[]> {
  const newer = alias(session, 'newer');
  const rows = await tx
    .select({
      date: session.date,
      weekInBlock: session.weekInBlock,
      minutes: session.minutes,
      finishedId: sessionLog.id,
    })
    .from(session)
    .leftJoin(sessionLog, eq(sessionLog.sessionId, session.id))
    .where(
      and(
        eq(session.userId, userId),
        notExists(
          tx.select({ one: newer.id }).from(newer).where(eq(newer.supersedesId, session.id)),
        ),
      ),
    );
  return rows.map(({ finishedId, ...rest }) => ({ ...rest, finished: finishedId !== null }));
}
