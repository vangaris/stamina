import { and, eq } from 'drizzle-orm';
import { adaptation, adaptationDecision } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import type { StoredAdaptation } from './types.ts';

/**
 * The user's Adaptation with its decision, or `null` when the id is not theirs or does not exist.
 * Row-level security does the isolation; the `user_id` condition says so in the query.
 */
export async function readAdaptation(
  tx: UserTx,
  userId: string,
  adaptationId: string,
): Promise<StoredAdaptation | null> {
  const [found] = await tx
    .select({ row: adaptation, decision: adaptationDecision })
    .from(adaptation)
    .leftJoin(adaptationDecision, eq(adaptationDecision.adaptationId, adaptation.id))
    .where(and(eq(adaptation.id, adaptationId), eq(adaptation.userId, userId)));
  return found ?? null;
}
