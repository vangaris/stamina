import {
  CARBS_G_PER_KG,
  DRINKS_BASE_ML,
  DRINKS_MAX_EXERCISE_ML_PER_HOUR,
  DRINKS_ML_PER_HOT_TRAINING_HOUR,
  DRINKS_ML_PER_TRAINING_HOUR,
  DURING_CARBS_G_PER_HOUR,
  DURING_CARBS_MINUTES,
  ELECTROLYTE_NOTE_MINUTES,
  EVERYDAY_ACTIVITY_FACTOR,
  FAT_LOSS_DEFICIT_HALVED_KCAL,
  FAT_LOSS_DEFICIT_KCAL,
  FAT_MAX_ENERGY_SHARE,
  FAT_MIN_ENERGY_SHARE,
  KCAL_PER_G_CARBS,
  KCAL_PER_G_FAT,
  KCAL_PER_G_PROTEIN,
  MINUTES_IN_HOUR,
  MUSCLE_GAIN_SURPLUS_KCAL,
  PRE_ACTIVITY_ML_PER_KG,
  PROTEIN_G_PER_KG,
  PROTEIN_G_PER_KG_LOSING_FAT,
} from '../config.ts';
import { BodyDirection } from '../enums/body-direction.ts';
import { DayType } from '../enums/day-type.ts';
import { TrainingKind } from '../enums/training-kind.ts';
import type { DayTargets, DayTargetsInput, TrainingBlock } from '../types.ts';
import { restingEnergy } from './resting-energy.ts';

function dayTypeOf(trainings: readonly TrainingBlock[]): DayType {
  const activities = trainings.filter((t) => t.kind === TrainingKind.Activity);
  if (activities.some((t) => t.hard)) return DayType.HardActivity;
  if (activities.length > 0) return DayType.Activity;
  if (trainings.length > 0) return DayType.Session;
  return DayType.Rest;
}

/** Energy, macros, and drinks for one day, from the person's setup and that day's training. */
export function dayTargets(input: DayTargetsInput): DayTargets {
  const { weightKg, trainings, bodyDirection } = input;
  const dayType = dayTypeOf(trainings);
  const activities = trainings.filter((t) => t.kind === TrainingKind.Activity);

  const resting = restingEnergy(input);
  const trainingKcal = trainings.reduce(
    (sum, t) => sum + (t.mets - 1) * weightKg * (t.minutes / MINUTES_IN_HOUR),
    0,
  );
  const base = resting * EVERYDAY_ACTIVITY_FACTOR[input.everydayActivity] + trainingKcal;

  const losingFat = bodyDirection === BodyDirection.LoseFat;
  const deficitApplies = losingFat && dayType !== DayType.HardActivity;
  const deficit = deficitApplies
    ? -(input.deficitHalved ? FAT_LOSS_DEFICIT_HALVED_KCAL : FAT_LOSS_DEFICIT_KCAL)
    : 0;
  const gain = bodyDirection === BodyDirection.GainMuscle ? MUSCLE_GAIN_SURPLUS_KCAL : 0;
  const adjusted = base + deficit + gain;
  const floorApplied = adjusted < resting;
  const energy = floorApplied ? resting : adjusted;

  const protein = weightKg * (losingFat ? PROTEIN_G_PER_KG_LOSING_FAT : PROTEIN_G_PER_KG);
  const minFatKcal = energy * FAT_MIN_ENERGY_SHARE;
  const wantedCarbs = weightKg * CARBS_G_PER_KG[dayType];
  // Carbs give way first when protein, carbs, and the minimum fat exceed the energy.
  const carbs = Math.max(
    0,
    Math.min(wantedCarbs, (energy - protein * KCAL_PER_G_PROTEIN - minFatKcal) / KCAL_PER_G_CARBS),
  );
  const remainderFatKcal = energy - protein * KCAL_PER_G_PROTEIN - carbs * KCAL_PER_G_CARBS;
  const fatKcal = Math.min(energy * FAT_MAX_ENERGY_SHARE, Math.max(minFatKcal, remainderFatKcal));

  const hours = trainings.reduce((sum, t) => sum + t.minutes / MINUTES_IN_HOUR, 0);
  const exerciseMl = trainings.reduce(
    (sum, t) =>
      sum +
      (t.minutes / MINUTES_IN_HOUR) *
        (DRINKS_ML_PER_TRAINING_HOUR + (t.hot ? DRINKS_ML_PER_HOT_TRAINING_HOUR : 0)),
    0,
  );
  const exerciseCapMl = hours * DRINKS_MAX_EXERCISE_ML_PER_HOUR;
  const drinkCapApplied = exerciseMl > exerciseCapMl;

  const hasActivity = activities.length > 0;
  const longest = Math.max(0, ...activities.map((t) => t.minutes));
  return {
    dayType,
    restingKcal: Math.round(resting),
    energyKcal: Math.round(energy),
    deficitKcal: Math.round(energy - base < 0 && losingFat ? energy - base : 0),
    gainKcal: gain,
    floorApplied,
    deficitHalved: deficitApplies && input.deficitHalved,
    proteinG: Math.round(protein),
    carbsG: Math.round(carbs),
    fatG: Math.round(fatKcal / KCAL_PER_G_FAT),
    drinksMl: Math.round(DRINKS_BASE_ML[input.sex] + Math.min(exerciseMl, exerciseCapMl)),
    drinkCapApplied,
    drinkToThirst: trainings.length > 0,
    preActivityMl: hasActivity
      ? {
          min: Math.round(PRE_ACTIVITY_ML_PER_KG.min * weightKg),
          max: Math.round(PRE_ACTIVITY_ML_PER_KG.max * weightKg),
        }
      : null,
    electrolyteNote: longest > ELECTROLYTE_NOTE_MINUTES || trainings.some((t) => t.hot),
    duringCarbsGPerHour: longest > DURING_CARBS_MINUTES ? { ...DURING_CARBS_G_PER_HOUR } : null,
  };
}
