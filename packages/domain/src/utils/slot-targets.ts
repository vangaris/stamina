import { MEAL_SHARES } from '../config.ts';
import type { SlotTargets, SlotTargetsDay } from '../types.ts';
import { mealSlots } from './meal-slots.ts';

/** Splits the day's protein, carbs and energy across the meal slots by the configured shares. */
export function slotTargets(day: SlotTargetsDay, mealsPerDay: number): SlotTargets[] {
  const slots = mealSlots(mealsPerDay);
  const shares = MEAL_SHARES[slots.length] ?? [];
  return slots.map(({ slot, at }, index) => {
    const share = shares[index] ?? 0;
    return {
      slot,
      at,
      proteinG: Math.round(day.proteinG * share),
      carbsG: Math.round(day.carbsG * share),
      kcal: Math.round(day.energyKcal * share),
    };
  });
}
