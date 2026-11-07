import { NutritionStatus, type NutritionState } from '@stamina/contracts';
import {
  CookingEffort,
  DayType,
  EatingPattern,
  EnergySex,
  EverydayActivity,
  MealSlot,
} from '@stamina/domain';

type Ready = Extract<NutritionState, { status: NutritionStatus.Ready }>;

/** A Ready Meals day: a rest day with 120 ml of water logged, three meals, no rate check. */
export function buildReadyNutrition(overrides: Partial<Ready> = {}): Ready {
  return {
    status: NutritionStatus.Ready,
    date: '2026-11-06',
    setup: {
      sex: EnergySex.Male,
      heightCm: 180,
      weightKg: 80,
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
      restingKcal: 1780,
      energyKcal: 2670,
      deficitKcal: 0,
      gainKcal: 0,
      floorApplied: false,
      deficitHalved: false,
      proteinG: 128,
      carbsG: 240,
      fatG: 104,
      drinksMl: 2000,
      drinkCapApplied: false,
      drinkToThirst: false,
      preActivityMl: null,
      electrolyteNote: false,
      duringCarbsGPerHour: null,
    },
    water: { ml: 120, targetMl: 2000 },
    meals: [
      { slot: MealSlot.Breakfast, at: 480, idea: null, status: null },
      { slot: MealSlot.Lunch, at: 780, idea: null, status: null },
      { slot: MealSlot.Dinner, at: 1170, idea: null, status: null },
    ],
    rateCheck: { deficitHalved: false, prompt: false },
    ...overrides,
  };
}
