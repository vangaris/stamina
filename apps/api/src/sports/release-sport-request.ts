import { normalizeSportName } from '@stamina/domain';
import { sql } from 'drizzle-orm';
import type { UserTx } from '../db/types.ts';

/**
 * Gives up an earlier request after a rename: the `release_sport_request` SQL function deletes the
 * requested sport when the caller was its only requester and nothing was drafted for it.
 */
export async function releaseSportRequest(tx: UserTx, name: string): Promise<void> {
  await tx.execute(sql`select release_sport_request(${normalizeSportName(name)})`);
}
