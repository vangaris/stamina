import { NutritionStatus, type NutritionState } from '@stamina/contracts';
import type { LocalMeal } from '../types.ts';

/**
 * Meals for the day plus the meal logs this device made that the server does not show yet. A
 * local log applies when its day is the state's `date` (a log with no day is the UTC day it was
 * recorded, as the server reads it) and the state is `Ready`; per slot the latest `recordedAt`
 * wins and overrides the server's status. A log for a slot the day does not have is ignored.
 * Neither input changes (with nothing to apply, the state is returned as it is).
 */
export function mergeLocalMeals(
  nutrition: NutritionState,
  local: readonly LocalMeal[],
): NutritionState {
  if (nutrition.status !== NutritionStatus.Ready) return nutrition;
  const latest = new Map<number, LocalMeal>();
  for (const row of local) {
    if ((row.meal.date ?? row.recordedAt.slice(0, 10)) !== nutrition.date) continue;
    const kept = latest.get(row.meal.slotIndex);
    if (kept === undefined || row.recordedAt >= kept.recordedAt)
      latest.set(row.meal.slotIndex, row);
  }
  const applicable = [...latest].filter(([slotIndex]) => nutrition.meals[slotIndex] !== undefined);
  if (applicable.length === 0) return nutrition;
  const meals = nutrition.meals.map((meal, slotIndex) => {
    const row = latest.get(slotIndex);
    return row === undefined ? meal : { ...meal, status: row.meal.status };
  });
  return { ...nutrition, meals };
}
