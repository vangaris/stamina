import { asc, eq } from 'drizzle-orm';
import { adaptation, adaptationDecision } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import type { StoredAdaptation } from './types.ts';

/** Every Adaptation stored for the user with its decision, oldest first (the data export). */
export async function readAdaptationRows(tx: UserTx, userId: string): Promise<StoredAdaptation[]> {
  return tx
    .select({ row: adaptation, decision: adaptationDecision })
    .from(adaptation)
    .leftJoin(adaptationDecision, eq(adaptationDecision.adaptationId, adaptation.id))
    .where(eq(adaptation.userId, userId))
    .orderBy(asc(adaptation.createdAt), asc(adaptation.ask), asc(adaptation.ruleId));
}
