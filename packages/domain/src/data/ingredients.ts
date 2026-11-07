import type { Ingredient } from '../types.ts';
import animalFoodsAndDrinks from './ingredients/animal-foods-and-drinks.json' with { type: 'json' };
import grainsAndStarches from './ingredients/grains-and-starches.json' with { type: 'json' };
import plantProteinsFatsAndPantry from './ingredients/plant-proteins-fats-and-pantry.json' with { type: 'json' };
import vegetablesAndFruit from './ingredients/vegetables-and-fruit.json' with { type: 'json' };

/** The whole ingredient vocabulary, bundled so names and nutrients are available offline. */
export const INGREDIENTS: readonly Ingredient[] = [
  ...(grainsAndStarches as Ingredient[]),
  ...(vegetablesAndFruit as Ingredient[]),
  ...(plantProteinsFatsAndPantry as Ingredient[]),
  ...(animalFoodsAndDrinks as Ingredient[]),
];
