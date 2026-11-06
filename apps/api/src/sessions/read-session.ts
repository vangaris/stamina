import type { SessionDetail } from '@stamina/contracts';
import { eq } from 'drizzle-orm';
import { setLog } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { readProgressions } from './read-progressions.ts';
import { readSessionPlan } from './read-session-plan.ts';
import { toSessionDetail } from './to-session-detail.ts';

/**
 * One of the user's Sessions with everything the Session screen shows: its exercises with names and
 * tagged easier and harder variants, the sets logged so far, the finish record, and per exercise the
 * suggested weight and progression from the last finished Session that logged it. `null` when the
 * Session is not the user's or does not exist. Reads as the app role, so row-level security keeps
 * it to the user's own rows.
 */
export async function readSession(
  tx: UserTx,
  userId: string,
  sessionId: string,
): Promise<SessionDetail | null> {
  const plan = await readSessionPlan(tx, userId, sessionId);
  if (plan === null) return null;
  const sets = await tx.select().from(setLog).where(eq(setLog.sessionId, sessionId));
  return toSessionDetail(plan, sets, await readProgressions(tx, userId, plan));
}
