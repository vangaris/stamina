import { UnlockField } from '../enums/unlock-field.ts';
import { parseWeight } from '../../progress/index.ts';
import type { SetupResult, UnlockDraft } from '../types.ts';
import { parseHeight } from './parse-height.ts';

/**
 * The setup a filled-in form stands for, or the inputs that are missing or not usable, in the
 * order the form shows them. The body direction is only asked (and so only required) when the
 * person's Goal is about their body; otherwise it is sent as nothing.
 */
export function toNutritionSetup(draft: UnlockDraft, askDirection: boolean): SetupResult {
  const heightCm = parseHeight(draft.height);
  const weightKg = parseWeight(draft.weight);
  const missing: UnlockField[] = [];
  if (draft.sex === null) missing.push(UnlockField.Sex);
  if (heightCm === undefined) missing.push(UnlockField.Height);
  if (weightKg === undefined) missing.push(UnlockField.Weight);
  if (draft.everydayActivity === null) missing.push(UnlockField.EverydayActivity);
  if (askDirection && draft.bodyDirection === null) missing.push(UnlockField.BodyDirection);
  if (
    missing.length > 0 ||
    draft.sex === null ||
    heightCm === undefined ||
    weightKg === undefined ||
    draft.everydayActivity === null
  ) {
    return { missing };
  }
  return {
    setup: {
      sex: draft.sex,
      heightCm,
      weightKg,
      everydayActivity: draft.everydayActivity,
      eatingPattern: draft.eatingPattern,
      allergens: [...draft.allergens],
      dislikes: [...draft.dislikes],
      mealsPerDay: draft.mealsPerDay,
      cookingEffort: draft.cookingEffort,
      bodyDirection: askDirection ? draft.bodyDirection : null,
    },
  };
}
