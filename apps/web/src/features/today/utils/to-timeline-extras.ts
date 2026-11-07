import { NutritionStatus, type NutritionState } from '@stamina/contracts';
import { MealSlot } from '@stamina/domain';
import { MealSlotKind } from '../enums/meal-slot-kind.ts';
import type { TimelineExtras } from '../types.ts';

const SLOT_KIND: Record<MealSlot, MealSlotKind> = {
  [MealSlot.Breakfast]: MealSlotKind.Breakfast,
  [MealSlot.Lunch]: MealSlotKind.Lunch,
  [MealSlot.Dinner]: MealSlotKind.Dinner,
  [MealSlot.Snack]: MealSlotKind.Snack,
};

/**
 * What Nutrition adds to the timeline: the meal slots and the water so far, only when Meals is
 * ready. Locked, switched off or not read yet: nothing is drawn.
 */
export function toTimelineExtras(nutrition: NutritionState | undefined): TimelineExtras {
  if (nutrition?.status !== NutritionStatus.Ready) return {};
  return {
    meals: nutrition.meals.map(({ slot, at }) => ({
      id: `${slot}-${at}`,
      slot: SLOT_KIND[slot],
      at,
      title: undefined,
    })),
    water: { ml: nutrition.water.ml, targetMl: nutrition.water.targetMl },
  };
}
