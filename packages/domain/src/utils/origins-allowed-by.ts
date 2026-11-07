import { EatingPattern } from '../enums/eating-pattern.ts';
import { Origin } from '../enums/origin.ts';

const VEGETARIAN: readonly Origin[] = [Origin.Plant, Origin.Dairy, Origin.Egg, Origin.Honey];

/** The origins a person following the eating pattern eats. */
export function originsAllowedBy(pattern: EatingPattern): readonly Origin[] {
  switch (pattern) {
    case EatingPattern.Vegan:
      return [Origin.Plant];
    case EatingPattern.Vegetarian:
      return VEGETARIAN;
    case EatingPattern.Pescatarian:
      return [...VEGETARIAN, Origin.Seafood];
    case EatingPattern.Everything:
      return [...VEGETARIAN, Origin.Seafood, Origin.Meat];
  }
}
