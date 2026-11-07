import {
  ApiPath,
  HttpMethod,
  NutritionStatus,
  NutritionSubpath,
  logMealResultSchema,
  logWaterResultSchema,
  nutritionPath,
  nutritionStateSchema,
  saveNutritionSetupResultSchema,
  type LogMeal,
  type LogWater,
  type NutritionSetup,
  type NutritionState,
} from '@stamina/contracts';
import {
  CookingEffort,
  EatingPattern,
  EnergySex,
  EverydayActivity,
  MealLogStatus,
  WaterAmount,
} from '@stamina/domain';
import { programUser } from './program-fixtures.ts';
import type { FixtureUser, TestApi } from './safety-fixtures.ts';

/** A man of 180 cm and 80 kg who is on his feet all day, eats everything, three meals, maintenance. */
export const setupOf = (overrides: Partial<NutritionSetup> = {}): NutritionSetup => ({
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
  ...overrides,
});

/** Calls `PUT /nutrition/setup`; the result is parsed when the answer is `200` or `422`. */
export async function putSetup(user: FixtureUser, setup: NutritionSetup) {
  const response = await user.call(HttpMethod.Put, nutritionPath(NutritionSubpath.Setup), setup);
  return {
    status: response.status,
    result: [200, 422].includes(response.status)
      ? saveNutritionSetupResultSchema.parse(await response.json())
      : null,
  };
}

/** Calls `GET /nutrition?date=`. */
export async function getNutrition(user: FixtureUser, date: string): Promise<NutritionState> {
  const response = await user.call(HttpMethod.Get, `${ApiPath.Nutrition}?date=${date}`);
  if (response.status !== 200) throw new Error(`get nutrition failed: ${response.status}`);
  return nutritionStateSchema.parse(await response.json());
}

/** The `Ready` Meals of a day, failing the test when it is locked or off. */
export async function getReady(user: FixtureUser, date: string) {
  const state = await getNutrition(user, date);
  if (state.status !== NutritionStatus.Ready) throw new Error(`nutrition is ${state.status}`);
  return state;
}

/** Calls `POST /water`; the result is parsed only when the answer is `200`. */
export async function postWater(user: FixtureUser, entry: LogWater) {
  const response = await user.call(HttpMethod.Post, ApiPath.Water, entry);
  return {
    status: response.status,
    result: response.status === 200 ? logWaterResultSchema.parse(await response.json()) : null,
  };
}

/** A water log as the device would send it: a fresh id and 250 ml. */
export const waterOf = (overrides: Partial<LogWater> = {}): LogWater => ({
  id: crypto.randomUUID(),
  ml: WaterAmount.Small,
  ...overrides,
});

/** Calls `POST /meal-logs`; the result is parsed only when the answer is `200`. */
export async function postMealLog(user: FixtureUser, entry: LogMeal) {
  const response = await user.call(HttpMethod.Post, ApiPath.MealLogs, entry);
  return {
    status: response.status,
    result: response.status === 200 ? logMealResultSchema.parse(await response.json()) : null,
  };
}

/** A meal log as the device would send it: a fresh id, the first slot, ate it. */
export const mealLogOf = (overrides: Partial<LogMeal> = {}): LogMeal => ({
  id: crypto.randomUUID(),
  slotIndex: 0,
  status: MealLogStatus.Ate,
  ...overrides,
});

/** A food-only user (no training week) with the Unlock Meals setup saved from `setupOf(setup)`. */
export async function foodUser(api: TestApi, setup: Partial<NutritionSetup> = {}) {
  const user = await programUser(api, { foodOnly: true });
  const saved = await putSetup(user, setupOf(setup));
  if (saved.status !== 200) throw new Error(`setup failed: ${saved.status}`);
  return user;
}
