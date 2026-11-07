import type { MealLogStatus } from '@stamina/domain';
import { and, asc, eq } from 'drizzle-orm';
import { mealLog } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';

/** The latest status the user logged for each slot of `date`, by slot index (the latest row wins). */
export async function readMealStatuses(
  tx: UserTx,
  userId: string,
  date: string,
): Promise<Map<number, MealLogStatus>> {
  const rows = await tx
    .select({ slotIndex: mealLog.slotIndex, status: mealLog.status })
    .from(mealLog)
    .where(and(eq(mealLog.userId, userId), eq(mealLog.date, date)))
    .orderBy(asc(mealLog.createdAt));
  return new Map(rows.map(({ slotIndex, status }) => [slotIndex, status]));
}
