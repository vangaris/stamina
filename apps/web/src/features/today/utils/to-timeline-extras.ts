import { NutritionStatus, type NutritionState } from '@stamina/contracts';
import { getTemplate, MealSlot } from '@stamina/domain';
import type { Locale } from '@stamina/i18n';
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
 * ready. Locked, switched off or not read yet: nothing is drawn. A meal is titled by its idea's
 * dish name in the person's language.
 */
export function toTimelineExtras(
  nutrition: NutritionState | undefined,
  locale: Locale,
): TimelineExtras {
  if (nutrition?.status !== NutritionStatus.Ready) return {};
  return {
    meals: nutrition.meals.map(({ slot, at, idea, status }) => ({
      id: `${slot}-${at}`,
      slot: SLOT_KIND[slot],
      at,
      title: idea ? getTemplate(idea.templateId)?.names[locale] : undefined,
      status,
    })),
    water: { ml: nutrition.water.ml, targetMl: nutrition.water.targetMl },
  };
}
