import { LoadGuidance } from '../enums/load-guidance.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import type { GeneratedExercise, PlannableExercise, Prescription } from '../types.ts';

/**
 * The prescription for `exercise` standing in the slot of `template`: the template's sets and
 * reps, its reps in reserve (`fallbackRir` when the template was not rated but this exercise is),
 * and the load guidance this exercise needs. Never more sets or fewer reps in reserve than the template.
 */
export function swapPrescription(
  template: GeneratedExercise,
  exercise: PlannableExercise,
  fallbackRir: number,
): Prescription {
  const rated = template.slot !== SessionSlot.WarmUp && template.slot !== SessionSlot.CoolDown;
  return {
    sets: template.sets,
    repMin: template.repMin,
    repMax: template.repMax,
    unit: template.unit,
    rir: rated && exercise.rirSuitable ? (template.rir ?? fallbackRir) : null,
    loadGuidance: !rated
      ? LoadGuidance.None
      : exercise.equipment.length === 0
        ? LoadGuidance.Bodyweight
        : exercise.rirSuitable
          ? LoadGuidance.RpeGuided
          : LoadGuidance.None,
  };
}
