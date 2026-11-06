import { asc, eq } from 'drizzle-orm';
import { block, profile } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';

/**
 * The day weeks are counted from: the start of the user's first Block, else the day their profile
 * was created (UTC), else `today`. It never moves once the Program exists, so the weeks stay put.
 */
export async function readLoadAnchor(tx: UserTx, userId: string, today: string): Promise<string> {
  const [first] = await tx
    .select({ startsOn: block.startsOn })
    .from(block)
    .where(eq(block.userId, userId))
    .orderBy(asc(block.startsOn))
    .limit(1);
  if (first !== undefined) return first.startsOn;

  const [own] = await tx
    .select({ createdAt: profile.createdAt })
    .from(profile)
    .where(eq(profile.userId, userId));
  return own === undefined ? today : own.createdAt.toISOString().slice(0, 10);
}
