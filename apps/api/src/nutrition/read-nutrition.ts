import { NutritionStatus, type NutritionState } from '@stamina/contracts';
import { Goal, dayTargets, mealSlots, rateCheck } from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { readLoadAnchor } from '../activities/index.ts';
import { profile } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { readLatestScreening } from '../safety/read-latest-screening.ts';
import { readTrainingBlocks } from './read-training-blocks.ts';
import { readWaterTotal } from './read-water-total.ts';
import { readWeeklyWeights } from './read-weekly-weights.ts';
import { toNutritionSetup } from './to-nutrition-setup.ts';

/**
 * What Meals shows for `date` (the person's calendar day, `YYYY-MM-DD`; `now` gives the UTC year
 * for age and the UTC day that anchors the weeks). `Off` while the latest Screening turned
 * Nutrition off (whatever was saved before), `Locked` while the Unlock Meals setup is not saved
 * (or there is no profile), otherwise `Ready`: the day's targets from the basis weight and the
 * day's training (`readTrainingBlocks`), the rate check over the weekly weights, the water logged
 * that day against the drinks target, and the meal slots. Targets are computed here on every
 * read, so a changed Goal, schedule or basis weight recalculates with no second step.
 */
export async function readNutrition(
  tx: UserTx,
  userId: string,
  date: string,
  now: Date,
): Promise<NutritionState> {
  const [own] = await tx.select().from(profile).where(eq(profile.userId, userId));
  const screening = await readLatestScreening(tx, userId);
  if (screening?.nutritionOff) return { status: NutritionStatus.Off };

  const setup = own === undefined ? null : toNutritionSetup(own, own.goal === Goal.BodyComposition);
  if (own === undefined || setup === null) return { status: NutritionStatus.Locked };

  const today = now.toISOString().slice(0, 10);
  const anchor = await readLoadAnchor(tx, userId, today);
  const check = rateCheck(await readWeeklyWeights(tx, userId, anchor));
  const targets = dayTargets({
    sex: setup.sex,
    ageYears: now.getUTCFullYear() - own.birthYear,
    heightCm: setup.heightCm,
    weightKg: setup.weightKg,
    everydayActivity: setup.everydayActivity,
    bodyDirection: setup.bodyDirection,
    trainings: await readTrainingBlocks(tx, userId, own, date, today),
    deficitHalved: check.deficitHalved,
  });

  return {
    status: NutritionStatus.Ready,
    date,
    setup,
    targets,
    water: { ml: await readWaterTotal(tx, userId, date), targetMl: targets.drinksMl },
    meals: mealSlots(setup.mealsPerDay),
    rateCheck: { deficitHalved: targets.deficitHalved, prompt: check.prompt },
  };
}
