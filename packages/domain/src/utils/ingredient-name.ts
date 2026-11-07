import type { Ingredient, NameLocale } from '../types.ts';

export function ingredientName(ingredient: Ingredient, locale: NameLocale): string {
  return ingredient.names[locale];
}
