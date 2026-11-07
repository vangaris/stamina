import { NutritionStatus, type NutritionState } from '@stamina/contracts';
import type { LocalWater } from '../types.ts';

/**
 * Meals for the day plus the water this device logged that the server does not show yet. A
 * local log counts when its day is the state's `date` (a log with no day is the UTC day it was
 * recorded, as the server reads it) and the state is `Ready`; `Locked` and `Off` carry no water.
 * The server's day total carries no ids, so the device removes a log from its store the moment
 * the server has it; whatever is left here is not in `water.ml`. Neither input changes (with
 * nothing to add, the state is returned as it is).
 */
export function mergeLocalWater(
  nutrition: NutritionState,
  local: readonly LocalWater[],
): NutritionState {
  if (nutrition.status !== NutritionStatus.Ready) return nutrition;
  const added = local
    .filter(({ water, recordedAt }) => (water.date ?? recordedAt.slice(0, 10)) === nutrition.date)
    .reduce((total, { water }) => total + water.ml, 0);
  if (added === 0) return nutrition;
  return { ...nutrition, water: { ...nutrition.water, ml: nutrition.water.ml + added } };
}
