import { and, eq, sum } from 'drizzle-orm';
import { waterLog } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';

/** Millilitres of water the user logged on `date`. */
export async function readWaterTotal(tx: UserTx, userId: string, date: string): Promise<number> {
  const [row] = await tx
    .select({ ml: sum(waterLog.ml) })
    .from(waterLog)
    .where(and(eq(waterLog.userId, userId), eq(waterLog.date, date)));
  return Number(row?.ml ?? 0);
}
