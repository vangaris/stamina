import { MAX_MEALS_PER_DAY, MEAL_TIMES, MIN_MEALS_PER_DAY } from '../config.ts';
import type { MealSlotTime } from '../types.ts';

/** The meal slots of a day with their times, ordered by time. Out-of-range counts clamp. */
export function mealSlots(mealsPerDay: number): MealSlotTime[] {
  const count = Math.min(MAX_MEALS_PER_DAY, Math.max(MIN_MEALS_PER_DAY, Math.round(mealsPerDay)));
  return (MEAL_TIMES[count] ?? []).map((meal) => ({ ...meal }));
}
