import { RECALCULATE_AT_KG_CHANGE } from '@stamina/domain';
import { and, eq, gt, isNotNull } from 'drizzle-orm';
import { profile, weighIn } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';

/**
 * After a weigh-in of `weightKg` dated `date`: moves the weight the targets are based on to it
 * when it is `RECALCULATE_AT_KG_CHANGE` or more away from that basis. Does nothing before the
 * Unlock Meals setup, and when the weigh-in is back-dated behind a later one (it is not the
 * person's current weight). The difference is rounded to grams first, so 69.9 to 71.9 counts as 2.
 */
export async function rebaseNutritionWeight(
  tx: UserTx,
  userId: string,
  weightKg: number,
  date: string,
): Promise<void> {
  const [own] = await tx
    .select({ basis: profile.nutritionWeightKg })
    .from(profile)
    .where(and(eq(profile.userId, userId), isNotNull(profile.nutritionWeightKg)));
  if (own === undefined || own.basis === null) return;

  const [later] = await tx
    .select({ id: weighIn.id })
    .from(weighIn)
    .where(and(eq(weighIn.userId, userId), gt(weighIn.date, date)))
    .limit(1);
  if (later !== undefined) return;

  const change = Math.round(Math.abs(weightKg - own.basis) * 1000) / 1000;
  if (change < RECALCULATE_AT_KG_CHANGE) return;
  await tx.update(profile).set({ nutritionWeightKg: weightKg }).where(eq(profile.userId, userId));
}
