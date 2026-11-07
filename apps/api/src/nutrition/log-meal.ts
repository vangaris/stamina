import type { LogMeal, LogMealResult } from '@stamina/contracts';
import { MAX_ACTIVITY_FUTURE_DAYS, daysBetween } from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { lockUser } from '../db/lock-user.ts';
import { mealLog } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { readLatestScreening } from '../safety/read-latest-screening.ts';
import { MealIdTakenError } from './meal-id-taken-error.ts';
import { MealNutritionOffError } from './meal-nutrition-off-error.ts';

const toResult = (row: typeof mealLog.$inferSelect): LogMealResult => ({
  id: row.id,
  date: row.date,
  slotIndex: row.slotIndex,
  status: row.status,
});

/**
 * Records what the person did about one meal slot (ate it, something else, skipped) for the day
 * the entry names, else today (UTC, from `now`); a day more than `MAX_ACTIVITY_FUTURE_DAYS`
 * ahead stores nothing and returns `null`. While the latest Screening has Nutrition off nothing
 * is stored and `MealNutritionOffError` is thrown (checked first, so a replay is refused too).
 * There is no limit on how far back: a log made offline arrives whenever the device is next
 * online. Rows are never rewritten: changing a status adds a row and the latest per day and slot
 * wins (`readMealStatuses`). Replays are safe: an id the user already has returns the stored row
 * and changes nothing (checked before the date, so a late retry still answers). An id that
 * belongs to another person throws `MealIdTakenError`. Runs under `lockUser`.
 */
export async function logMeal(
  db: Db,
  userId: string,
  entry: LogMeal,
  now: Date,
): Promise<LogMealResult | null> {
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);

    if ((await readLatestScreening(tx, userId))?.nutritionOff) throw new MealNutritionOffError();
    const [replay] = await tx.select().from(mealLog).where(eq(mealLog.id, entry.id));
    if (replay !== undefined) return toResult(replay);

    const today = now.toISOString().slice(0, 10);
    const date = entry.date ?? today;
    if (daysBetween(today, date) > MAX_ACTIVITY_FUTURE_DAYS) return null;

    const [stored] = await tx
      .insert(mealLog)
      .values({
        id: entry.id,
        userId,
        date,
        slotIndex: entry.slotIndex,
        status: entry.status,
        templateId: entry.templateId ?? null,
      })
      .onConflictDoNothing()
      .returning();
    if (stored === undefined) throw new MealIdTakenError();
    return toResult(stored);
  });
}
