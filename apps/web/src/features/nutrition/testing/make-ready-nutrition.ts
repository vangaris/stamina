import { NutritionStatus, type NutritionState } from '@stamina/contracts';
import {
  CookingEffort,
  DayType,
  EatingPattern,
  EnergySex,
  EverydayActivity,
  MealSlot,
} from '@stamina/domain';
import type { ReadyNutrition } from '../types.ts';

/** A ready Rest day for a 70 kg person, the way the server words it. */
export function makeReadyNutrition(overrides: Partial<ReadyNutrition> = {}): ReadyNutrition {
  return {
    status: NutritionStatus.Ready,
    date: '2026-11-07',
    setup: {
      sex: EnergySex.Female,
      heightCm: 168,
      weightKg: 70,
      everydayActivity: EverydayActivity.OnFeet,
      eatingPattern: EatingPattern.Everything,
      allergens: [],
      dislikes: [],
      mealsPerDay: 3,
      cookingEffort: CookingEffort.Normal,
      bodyDirection: null,
    },
    targets: {
      dayType: DayType.Rest,
      restingKcal: 1400,
      energyKcal: 2100,
      deficitKcal: 0,
      gainKcal: 0,
      floorApplied: false,
      deficitHalved: false,
      proteinG: 112,
      carbsG: 210,
      fatG: 75,
      drinksMl: 1600,
      drinkCapApplied: false,
      drinkToThirst: false,
      preActivityMl: null,
      electrolyteNote: false,
      duringCarbsGPerHour: null,
    },
    water: { ml: 0, targetMl: 1600 },
    meals: [
      { slot: MealSlot.Breakfast, at: 480, idea: null, status: null },
      { slot: MealSlot.Lunch, at: 780, idea: null, status: null },
      { slot: MealSlot.Dinner, at: 1170, idea: null, status: null },
    ],
    rateCheck: { deficitHalved: false, prompt: false },
    ...overrides,
  };
}

export const LOCKED: NutritionState = { status: NutritionStatus.Locked };
