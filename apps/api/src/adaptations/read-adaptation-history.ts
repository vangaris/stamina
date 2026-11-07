import { AdaptationStatus, type AdaptationHistoryEntry } from '@stamina/domain';
import type { UserTx } from '../db/types.ts';
import { readAdaptationRows } from './read-adaptation-rows.ts';

/** Every Adaptation stored for the user with where it stands, oldest first. */
export async function readAdaptationHistory(
  tx: UserTx,
  userId: string,
): Promise<AdaptationHistoryEntry[]> {
  const stored = await readAdaptationRows(tx, userId);
  return stored.map(({ row, decision }) => ({
    ruleId: row.ruleId,
    triggerKey: row.triggerKey,
    ask: row.ask,
    status: decision?.decision ?? AdaptationStatus.Pending,
    decidedAt: decision?.decidedAt.toISOString() ?? null,
    basis: row.basis,
    validUntil: row.validUntil,
  }));
}
