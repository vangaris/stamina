import type { MealTemplate } from '../types.ts';
import everything from './templates/everything.json' with { type: 'json' };
import pescatarian from './templates/pescatarian.json' with { type: 'json' };
import vegan from './templates/vegan.json' with { type: 'json' };
import vegetarian from './templates/vegetarian.json' with { type: 'json' };

/** Every fixed meal template, bundled so meal ideas work offline. */
export const TEMPLATES: readonly MealTemplate[] = [
  ...(everything as MealTemplate[]),
  ...(pescatarian as MealTemplate[]),
  ...(vegetarian as MealTemplate[]),
  ...(vegan as MealTemplate[]),
];
