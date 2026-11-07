import {
  Allergen,
  BodyDirection,
  CookingEffort,
  DayType,
  EatingPattern,
  EnergySex,
  EverydayActivity,
  MAX_BODY_WEIGHT_KG,
  MAX_DISLIKE_LENGTH,
  MAX_DISLIKES,
  MAX_HEIGHT_CM,
  MAX_MEALS_PER_DAY,
  MealLogStatus,
  MealSlot,
  MIN_BODY_WEIGHT_KG,
  MIN_HEIGHT_CM,
  MIN_MEALS_PER_DAY,
} from '@stamina/domain';
import { z } from 'zod';
import { mealIdeaSchema } from './meal-idea-schema.ts';
import { NutritionStatus } from './enums/nutrition-status.ts';
import { SaveNutritionSetupRejection } from './enums/save-nutrition-setup-rejection.ts';
import { SaveNutritionSetupStatus } from './enums/save-nutrition-setup-status.ts';

const isUnique = (list: readonly unknown[]) => new Set(list).size === list.length;
const isoDate = z.iso.date();
const whole = z.number().int();
const range = z.object({ min: whole.min(0), max: whole.min(0) });

/**
 * The Unlock Meals setup: body stats for the energy formula, food preferences and meals per day.
 * `weightKg` is the weight the targets are based on (it follows later weigh-ins that differ by
 * 2 kg or more). `bodyDirection` is asked only when the Goal is body composition, `null` otherwise
 * (maintenance). Health data: never logged.
 */
export const nutritionSetupSchema = z.object({
  sex: z.enum(EnergySex),
  heightCm: z.number().min(MIN_HEIGHT_CM).max(MAX_HEIGHT_CM),
  weightKg: z.number().min(MIN_BODY_WEIGHT_KG).max(MAX_BODY_WEIGHT_KG),
  everydayActivity: z.enum(EverydayActivity),
  eatingPattern: z.enum(EatingPattern),
  allergens: z.array(z.enum(Allergen)).refine(isUnique, { message: 'allergens must be unique' }),
  dislikes: z.array(z.string().trim().min(1).max(MAX_DISLIKE_LENGTH)).max(MAX_DISLIKES),
  mealsPerDay: whole.min(MIN_MEALS_PER_DAY).max(MAX_MEALS_PER_DAY),
  cookingEffort: z.enum(CookingEffort),
  bodyDirection: z.enum(BodyDirection).nullable(),
});

/** One day's targets as the rules worked them out; every number is rounded. */
export const dayTargetsSchema = z.object({
  dayType: z.enum(DayType),
  restingKcal: whole,
  energyKcal: whole,
  /** The deficit applied: 0, or negative. */
  deficitKcal: whole.max(0),
  gainKcal: whole.min(0),
  /** The target was raised to resting energy because the goal adjustment took it below. */
  floorApplied: z.boolean(),
  /** The rate check halved the fat-loss deficit. */
  deficitHalved: z.boolean(),
  proteinG: whole.min(0),
  carbsG: whole.min(0),
  fatG: whole.min(0),
  drinksMl: whole.min(0),
  /** The exercise addition was held to 1 L per training hour. */
  drinkCapApplied: z.boolean(),
  drinkToThirst: z.boolean(),
  preActivityMl: range.nullable(),
  electrolyteNote: z.boolean(),
  duringCarbsGPerHour: range.nullable(),
});

export const mealSlotTimeSchema = z.object({
  slot: z.enum(MealSlot),
  /** Minute of the day. */
  at: whole.min(0).max(1439),
});

/**
 * One slot of the day: its time, the idea built for it (`null` when no template fits the
 * person's food rules: the day still shows the targets) and the latest status they logged.
 */
export const nutritionMealSchema = mealSlotTimeSchema.extend({
  idea: mealIdeaSchema.nullable(),
  status: z.enum(MealLogStatus).nullable(),
});

const ready = z.object({
  status: z.literal(NutritionStatus.Ready),
  /** The day the targets are for (the person's calendar day, `YYYY-MM-DD`). */
  date: isoDate,
  setup: nutritionSetupSchema,
  targets: dayTargetsSchema,
  water: z.object({ ml: whole.min(0), targetMl: whole.min(0) }),
  meals: z.array(nutritionMealSchema),
  rateCheck: z.object({
    /** The deficit is halved because weight fell by more than 1 % a week two weeks running. */
    deficitHalved: z.boolean(),
    /** Show "talk to a dietitian or doctor". */
    prompt: z.boolean(),
  }),
});

/** `GET /nutrition?date=`: what Meals shows for one day. Off and Locked carry no targets. */
export const nutritionStateSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal(NutritionStatus.Locked) }),
  z.object({ status: z.literal(NutritionStatus.Off) }),
  ready,
]);

/** `PUT /nutrition/setup` answers `200` with `Saved` or `422` with `Rejected`. */
export const saveNutritionSetupResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal(SaveNutritionSetupStatus.Saved),
    nutrition: nutritionStateSchema,
  }),
  z.object({
    status: z.literal(SaveNutritionSetupStatus.Rejected),
    reason: z.enum(SaveNutritionSetupRejection),
  }),
]);
