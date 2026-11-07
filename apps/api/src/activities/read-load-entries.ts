import { asc, eq } from 'drizzle-orm';
import { activity, session, sessionLog } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import type { ActivityRow } from './types.ts';

/**
 * Everything that counts towards the user's weekly Load: the finished Sessions (the day each was
 * planned for and its Load) and every logged Activity, oldest first.
 */
export async function readLoadEntries(
  tx: UserTx,
  userId: string,
): Promise<{
  sessionEntries: { date: string; load: number }[];
  activityRows: ActivityRow[];
}> {
  const sessionEntries = await tx
    .select({ date: session.date, load: sessionLog.load })
    .from(sessionLog)
    .innerJoin(session, eq(session.id, sessionLog.sessionId))
    .where(eq(sessionLog.userId, userId));
  const activityRows = await tx
    .select()
    .from(activity)
    .where(eq(activity.userId, userId))
    .orderBy(asc(activity.date), asc(activity.loggedAt), asc(activity.id));
  return { sessionEntries, activityRows };
}
