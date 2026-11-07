import { CookingEffort, EatingPattern } from '@stamina/domain';
import { DEFAULT_MEALS_PER_DAY } from '../config.ts';
import type { UnlockDraft } from '../types.ts';

/** The Unlock Meals form before anything is answered: the usual choices are already on. */
export function toEmptyDraft(): UnlockDraft {
  return {
    sex: null,
    height: '',
    weight: '',
    everydayActivity: null,
    eatingPattern: EatingPattern.Everything,
    allergens: [],
    dislikes: [],
    dislikeText: '',
    mealsPerDay: DEFAULT_MEALS_PER_DAY,
    cookingEffort: CookingEffort.Normal,
    bodyDirection: null,
  };
}
