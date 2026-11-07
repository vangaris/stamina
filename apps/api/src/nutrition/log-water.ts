import type { LogWater, LogWaterResult } from '@stamina/contracts';
import { MAX_ACTIVITY_FUTURE_DAYS, daysBetween } from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { lockUser } from '../db/lock-user.ts';
import { waterLog } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { readLatestScreening } from '../safety/read-latest-screening.ts';
import { WaterIdTakenError } from './water-id-taken-error.ts';
import { WaterNutritionOffError } from './water-nutrition-off-error.ts';

/**
 * Records one water log (250 or 500 ml) for the day the entry names, else today (UTC, from
 * `now`); a day more than `MAX_ACTIVITY_FUTURE_DAYS` ahead stores nothing and returns `null`.
 * While the latest Screening has Nutrition off nothing is stored and `WaterNutritionOffError` is
 * thrown (checked first, so a replay is refused too). There is no limit on how far back: a log
 * made offline arrives whenever the device is next online. Replays are safe: an id the user
 * already has returns the stored row and changes nothing (checked before the date, so a late
 * retry still answers), so a resend never counts twice. An id that belongs to another person
 * throws `WaterIdTakenError`. Runs under `lockUser`.
 */
export async function logWater(
  db: Db,
  userId: string,
  entry: LogWater,
  now: Date,
): Promise<LogWaterResult | null> {
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);

    if ((await readLatestScreening(tx, userId))?.nutritionOff) throw new WaterNutritionOffError();
    const [replay] = await tx.select().from(waterLog).where(eq(waterLog.id, entry.id));
    if (replay !== undefined) return { id: replay.id, date: replay.date, ml: replay.ml };

    const today = now.toISOString().slice(0, 10);
    const date = entry.date ?? today;
    if (daysBetween(today, date) > MAX_ACTIVITY_FUTURE_DAYS) return null;

    const [stored] = await tx
      .insert(waterLog)
      .values({ id: entry.id, userId, date, ml: entry.ml })
      .onConflictDoNothing()
      .returning();
    if (stored === undefined) throw new WaterIdTakenError();
    return { id: stored.id, date: stored.date, ml: stored.ml };
  });
}
