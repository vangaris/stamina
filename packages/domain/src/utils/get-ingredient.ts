import { INGREDIENTS } from '../data/ingredients.ts';
import type { Ingredient } from '../types.ts';

const BY_ID = new Map<string, Ingredient>(
  INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]),
);

export function getIngredient(id: string): Ingredient | undefined {
  return BY_ID.get(id);
}
