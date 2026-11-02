import { desc, eq } from 'drizzle-orm';
import { screening } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import type { ScreeningRow } from './types.ts';

/** The user's most recent Screening (history is kept; the latest wins), or `undefined` before the first. */
export async function readLatestScreening(
  tx: UserTx,
  userId: string,
): Promise<ScreeningRow | undefined> {
  const [row] = await tx
    .select()
    .from(screening)
    .where(eq(screening.userId, userId))
    .orderBy(desc(screening.takenAt))
    .limit(1);
  return row;
}
