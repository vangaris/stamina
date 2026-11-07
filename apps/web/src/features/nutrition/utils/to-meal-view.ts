import { describePortion, getIngredient, getTemplate } from '@stamina/domain';
import type { Locale } from '@stamina/i18n';
import type { MealView, ReadyNutrition } from '../types.ts';
import { formatTime } from './format-time.ts';

/**
 * A meal slot as the screen draws it. Names and household measures are not sent by the server:
 * they are read from the app's own food data in the person's language, so they work offline. A
 * slot with no idea, or one this version does not know, has no title and no portions; an
 * ingredient this version does not know is left out of the portions.
 */
export function toMealView(
  meal: ReadyNutrition['meals'][number],
  index: number,
  locale: Locale,
): MealView {
  const base = { index, slot: meal.slot, time: formatTime(meal.at), status: meal.status };
  const template = meal.idea ? getTemplate(meal.idea.templateId) : undefined;
  if (!meal.idea || !template)
    return { ...base, title: undefined, portions: [], macros: undefined };
  return {
    ...base,
    title: template.names[locale],
    portions: meal.idea.portions.flatMap(({ ingredientId, grams }) => {
      const ingredient = getIngredient(ingredientId);
      return ingredient ? [describePortion(ingredient, grams, locale).line] : [];
    }),
    macros: {
      kcal: meal.idea.kcal,
      proteinG: meal.idea.proteinG,
      carbsG: meal.idea.carbsG,
      fatG: meal.idea.fatG,
    },
  };
}
