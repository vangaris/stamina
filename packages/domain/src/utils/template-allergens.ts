import { Allergen } from '../enums/allergen.ts';
import type { MealTemplate } from '../types.ts';
import { templateIngredients } from './template-ingredients.ts';

/** The allergens of a template: every allergen of any ingredient, in `Allergen` order. */
export function templateAllergens(template: MealTemplate): Allergen[] {
  const present = new Set<Allergen>(
    templateIngredients(template).flatMap((ingredient) => ingredient.allergens),
  );
  return Object.values(Allergen).filter((allergen) => present.has(allergen));
}
