import { nutritionSetupSchema, type NutritionSetup } from '@stamina/contracts';
import type { NutritionProfileRow } from './types.ts';

/**
 * The saved Unlock Meals setup of a profile row, or `null` while it is not saved (the columns are
 * all set or all null; the sex column stands for the set). The schema also guards against a
 * corrupt row. `bodyDirection` reads as maintenance (`null`) unless the Goal is still the one
 * that asks for it, so changing the Goal changes the targets with no second step.
 */
export function toNutritionSetup(
  row: NutritionProfileRow,
  bodyDirectionApplies: boolean,
): NutritionSetup | null {
  if (row.sex === null) return null;
  return nutritionSetupSchema.parse({
    sex: row.sex,
    heightCm: row.heightCm,
    weightKg: row.nutritionWeightKg,
    everydayActivity: row.everydayActivity,
    eatingPattern: row.eatingPattern,
    allergens: row.allergens,
    dislikes: row.dislikes,
    mealsPerDay: row.mealsPerDay,
    cookingEffort: row.cookingEffort,
    bodyDirection: bodyDirectionApplies ? row.bodyDirection : null,
  });
}
