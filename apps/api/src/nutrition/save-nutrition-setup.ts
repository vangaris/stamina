import {
  SaveNutritionSetupRejection,
  SaveNutritionSetupStatus,
  type NutritionSetup,
  type SaveNutritionSetupResult,
} from '@stamina/contracts';
import { Goal } from '@stamina/domain';
import { eq, sql } from 'drizzle-orm';
import { lockUser } from '../db/lock-user.ts';
import { profile, weighIn } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { readLatestScreening } from '../safety/read-latest-screening.ts';
import { readNutrition } from './read-nutrition.ts';

const rejected = (reason: SaveNutritionSetupRejection): SaveNutritionSetupResult => ({
  status: SaveNutritionSetupStatus.Rejected,
  reason,
});

/**
 * Saves the Unlock Meals setup (first time or an edit) and answers with Meals for today (UTC,
 * from `now`), or says why not. Order: no profile yet answers `null` (nothing to attach the
 * setup to); the latest Screening turned Nutrition off (`NutritionOff`); a body direction when
 * the Goal is not body composition (`BodyDirectionNotAllowed`). Nothing is stored for a rejection.
 * Saving sets the basis weight the targets use. It inserts a weigh-in of that weight dated today,
 * which starts the weight history, only on the first unlock or when the submitted weight differs
 * from the basis weight; an edit that leaves the weight alone adds none, so it cannot replace a
 * real weigh-in of the same day. Runs under `lockUser`, so it cannot interleave with a weigh-in.
 */
export async function saveNutritionSetup(
  db: Db,
  userId: string,
  setup: NutritionSetup,
  now: Date,
): Promise<SaveNutritionSetupResult | null> {
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);

    const [own] = await tx.select().from(profile).where(eq(profile.userId, userId));
    if (own === undefined) return null;
    if ((await readLatestScreening(tx, userId))?.nutritionOff) {
      return rejected(SaveNutritionSetupRejection.NutritionOff);
    }
    if (setup.bodyDirection !== null && own.goal !== Goal.BodyComposition) {
      return rejected(SaveNutritionSetupRejection.BodyDirectionNotAllowed);
    }

    await tx
      .update(profile)
      .set({
        sex: setup.sex,
        heightCm: setup.heightCm,
        nutritionWeightKg: setup.weightKg,
        everydayActivity: setup.everydayActivity,
        eatingPattern: setup.eatingPattern,
        allergens: setup.allergens,
        dislikes: setup.dislikes,
        mealsPerDay: setup.mealsPerDay,
        cookingEffort: setup.cookingEffort,
        bodyDirection: setup.bodyDirection,
        updatedAt: sql`now()`,
      })
      .where(eq(profile.userId, userId));
    // `null` (first unlock) never equals a weight, so the first save always starts the history.
    if (own.nutritionWeightKg !== setup.weightKg) {
      await tx.insert(weighIn).values({
        userId,
        weightKg: setup.weightKg,
        date: now.toISOString().slice(0, 10),
      });
    }

    return {
      status: SaveNutritionSetupStatus.Saved,
      nutrition: await readNutrition(tx, userId, now.toISOString().slice(0, 10), now),
    };
  });
}
