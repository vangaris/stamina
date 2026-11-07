import type { Ingredient, MealTemplate } from '../types.ts';
import { getIngredient } from './get-ingredient.ts';

/** The ingredients of a template, in order. A missing id is a data error and throws. */
export function templateIngredients(template: MealTemplate): Ingredient[] {
  return template.ingredients.map(({ ingredientId }) => {
    const ingredient = getIngredient(ingredientId);
    if (!ingredient)
      throw new Error(`Template ${template.id} uses unknown ingredient ${ingredientId}`);
    return ingredient;
  });
}
