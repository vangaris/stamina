import { AppErrorCode } from '@stamina/app-core';
import {
  Allergen,
  CookingEffort,
  EatingPattern,
  EnergySex,
  EverydayActivity,
  MAX_MEALS_PER_DAY,
  MealLogStatus,
  MIN_MEALS_PER_DAY,
  WaterAmount,
  BodyDirection,
} from '@stamina/domain';
import { RoutePath } from '../../enums/route-path.ts';
import { NutritionMessageKey } from './enums/nutrition-message-key.ts';
import { UnlockMessageKey } from './enums/unlock-message-key.ts';

export const ROUTE_WHEN_SIGNED_OUT = RoutePath.Start;

/** What a nutrition read that failed shows: the message for its error code, else the generic one. */
export const LOAD_ERROR_KEYS: Partial<Record<AppErrorCode, NutritionMessageKey>> = {
  [AppErrorCode.Offline]: NutritionMessageKey.Offline,
};

/** What a setup that could not be saved shows: the message for its error code, else the generic one. */
export const UNLOCK_ERROR_KEYS: Partial<Record<AppErrorCode, UnlockMessageKey>> = {
  [AppErrorCode.Offline]: UnlockMessageKey.Offline,
};

/** The water buttons, in the order they are shown. */
export const WATER_AMOUNTS: readonly WaterAmount[] = [WaterAmount.Small, WaterAmount.Large];

/** Height is typed in whole centimetres. */
export const HEIGHT_PATTERN = /^\d{2,3}$/;

export const SEX_OPTIONS: readonly EnergySex[] = [
  EnergySex.Female,
  EnergySex.Male,
  EnergySex.Unspecified,
];
export const EVERYDAY_ACTIVITY_OPTIONS: readonly EverydayActivity[] = [
  EverydayActivity.Sitting,
  EverydayActivity.OnFeet,
  EverydayActivity.Physical,
];
export const EATING_PATTERN_OPTIONS: readonly EatingPattern[] = [
  EatingPattern.Everything,
  EatingPattern.Pescatarian,
  EatingPattern.Vegetarian,
  EatingPattern.Vegan,
];
export const COOKING_EFFORT_OPTIONS: readonly CookingEffort[] = [
  CookingEffort.Quick,
  CookingEffort.Normal,
];
export const BODY_DIRECTION_OPTIONS: readonly BodyDirection[] = [
  BodyDirection.LoseFat,
  BodyDirection.GainMuscle,
];
export const ALLERGEN_OPTIONS: readonly Allergen[] = [
  Allergen.Celery,
  Allergen.Gluten,
  Allergen.Crustaceans,
  Allergen.Eggs,
  Allergen.Fish,
  Allergen.Lupin,
  Allergen.Milk,
  Allergen.Molluscs,
  Allergen.Mustard,
  Allergen.TreeNuts,
  Allergen.Peanuts,
  Allergen.Sesame,
  Allergen.Soybeans,
  Allergen.Sulphites,
];
/** 3, 4 or 5 meals a day. */
export const MEALS_PER_DAY_OPTIONS: readonly number[] = Array.from(
  { length: MAX_MEALS_PER_DAY - MIN_MEALS_PER_DAY + 1 },
  (_, index) => MIN_MEALS_PER_DAY + index,
);

export const DEFAULT_MEALS_PER_DAY = MIN_MEALS_PER_DAY;

/** The pre-Activity drink is taken this many hours ahead (a range, in hours). */
export const PRE_ACTIVITY_HOURS = { from: 2, to: 4 } as const;

/** The three one-tap answers for a meal, in the order they are shown. */
export const MEAL_STATUS_OPTIONS: readonly MealLogStatus[] = [
  MealLogStatus.Ate,
  MealLogStatus.Other,
  MealLogStatus.Skipped,
];

/** A meal stays "next" until its time is this many minutes past; after that the next unlogged one leads. */
export const NEXT_MEAL_GRACE_MINUTES = 90;

/** A clock time is shown as two digits for hours and for minutes: "08:05". */
export const CLOCK_DIGITS = 2;
export const CLOCK_PAD = '0';
