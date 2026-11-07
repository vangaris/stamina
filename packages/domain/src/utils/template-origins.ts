import { Origin } from '../enums/origin.ts';
import type { MealTemplate } from '../types.ts';
import { templateIngredients } from './template-ingredients.ts';

/** The origins of a template's ingredients, in `Origin` order. */
export function templateOrigins(template: MealTemplate): Origin[] {
  const present = new Set<Origin>(
    templateIngredients(template).map((ingredient) => ingredient.origin),
  );
  return Object.values(Origin).filter((origin) => present.has(origin));
}
