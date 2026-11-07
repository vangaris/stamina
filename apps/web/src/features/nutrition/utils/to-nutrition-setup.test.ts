import { BodyDirection, EnergySex, EverydayActivity } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { UnlockField } from '../enums/unlock-field.ts';
import type { UnlockDraft } from '../types.ts';
import { toEmptyDraft } from './to-empty-draft.ts';
import { toNutritionSetup } from './to-nutrition-setup.ts';

const filled = (): UnlockDraft => ({
  ...toEmptyDraft(),
  sex: EnergySex.Female,
  height: '168',
  weight: '61,5',
  everydayActivity: EverydayActivity.OnFeet,
});

describe('toNutritionSetup', () => {
  it('turns a filled form into the setup', () => {
    expect(toNutritionSetup(filled(), false)).toEqual({
      setup: {
        sex: EnergySex.Female,
        heightCm: 168,
        weightKg: 61.5,
        everydayActivity: EverydayActivity.OnFeet,
        eatingPattern: 'everything',
        allergens: [],
        dislikes: [],
        mealsPerDay: 3,
        cookingEffort: 'normal',
        bodyDirection: null,
      },
    });
  });

  it('names every input that is missing or not usable, in form order', () => {
    expect(toNutritionSetup({ ...toEmptyDraft(), height: '12' }, false)).toEqual({
      missing: [
        UnlockField.Sex,
        UnlockField.Height,
        UnlockField.Weight,
        UnlockField.EverydayActivity,
      ],
    });
  });

  it('needs a body direction only when it is asked', () => {
    expect(toNutritionSetup(filled(), true)).toEqual({ missing: [UnlockField.BodyDirection] });
    const asked = toNutritionSetup({ ...filled(), bodyDirection: BodyDirection.LoseFat }, true);
    expect(asked).toMatchObject({ setup: { bodyDirection: BodyDirection.LoseFat } });
  });

  it('sends no body direction when it is not asked, even if one was picked before', () => {
    const result = toNutritionSetup({ ...filled(), bodyDirection: BodyDirection.GainMuscle }, false);
    expect(result).toMatchObject({ setup: { bodyDirection: null } });
  });
});
