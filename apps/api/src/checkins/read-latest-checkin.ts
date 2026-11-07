import type { Checkin } from '@stamina/contracts';
import { desc, eq } from 'drizzle-orm';
import { checkin } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { toCheckin } from './to-checkin.ts';

/** The user's latest Check-in by day, then by when it was sent, or `null` before the first. */
export async function readLatestCheckin(tx: UserTx, userId: string): Promise<Checkin | null> {
  const [row] = await tx
    .select()
    .from(checkin)
    .where(eq(checkin.userId, userId))
    .orderBy(desc(checkin.date), desc(checkin.submittedAt))
    .limit(1);
  return row === undefined ? null : toCheckin(row);
}
