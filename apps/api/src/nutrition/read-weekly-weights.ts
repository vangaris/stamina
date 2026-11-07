import { toWeeklyWeights, type WeeklyWeight } from '@stamina/domain';
import { asc, eq } from 'drizzle-orm';
import { weighIn } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';

/**
 * The user's weight per program-anchored week (the last weigh-in of each week, by day then by
 * when it was entered), oldest week first. What the rate check reads.
 */
export async function readWeeklyWeights(
  tx: UserTx,
  userId: string,
  anchor: string,
): Promise<WeeklyWeight[]> {
  const rows = await tx
    .select({ date: weighIn.date, weightKg: weighIn.weightKg })
    .from(weighIn)
    .where(eq(weighIn.userId, userId))
    .orderBy(asc(weighIn.date), asc(weighIn.createdAt));
  return toWeeklyWeights(anchor, rows);
}
