import {
  FAILURE_RPE,
  PROGRESSION_DECREASE_FACTOR,
  PROGRESSION_HARD_RPE_MARGIN,
  PROGRESSION_HARD_SETS,
  PROGRESSION_INCREMENT_KG,
  WEIGHT_ROUNDING_KG,
} from '../config.ts';
import { LoadGuidance } from '../enums/load-guidance.ts';
import { ProgressionOutcome } from '../enums/progression-outcome.ts';
import type { ProgressLoadInput, Progression } from '../types.ts';

const roundToStep = (kg: number): number =>
  Math.round(kg / WEIGHT_ROUNDING_KG) * WEIGHT_ROUNDING_KG;

/**
 * What the next Session does with an exercise's weight, from how it went in the last finished
 * Session that logged it. The target RPE is 10 minus the prescribed reps in reserve. In order:
 * at least 2 sets two or more points above the target take 5 % off (`Decrease`); otherwise, when
 * every prescribed set was logged, each reached the top of the rep range and none was harder than
 * the target, add 2.5 kg for an upper-body exercise or 5 kg for a lower-body one (`Increase`);
 * otherwise keep the weight (`Hold`). The base is the heaviest weight logged, and the result is
 * rounded to the nearest half kilogram; a `Decrease` is always at least one step below the base.
 *
 * `null` when there is nothing to progress: no sets logged, effort was not rated (no prescribed
 * RIR), the exercise carries no weight (bodyweight, none), or the heaviest weight logged is 0.
 */
export function progressLoad({
  half,
  loadGuidance,
  sets,
  repMax,
  rir,
  logged,
}: ProgressLoadInput): Progression | null {
  if (rir === null || loadGuidance !== LoadGuidance.RpeGuided || logged.length === 0) return null;
  const base = Math.max(...logged.map((set) => set.weightKg));
  if (base <= 0) return null;

  const targetRpe = FAILURE_RPE - rir;
  const hardSets = logged.filter((set) => set.rpe >= targetRpe + PROGRESSION_HARD_RPE_MARGIN);
  if (hardSets.length >= PROGRESSION_HARD_SETS) {
    const rounded = roundToStep(base * PROGRESSION_DECREASE_FACTOR);
    return {
      outcome: ProgressionOutcome.Decrease,
      suggestedWeightKg: rounded < base ? rounded : Math.max(0, base - WEIGHT_ROUNDING_KG),
    };
  }
  const topOfRange =
    logged.length >= sets && logged.every((set) => set.reps >= repMax && set.rpe <= targetRpe);
  if (topOfRange) {
    return {
      outcome: ProgressionOutcome.Increase,
      suggestedWeightKg: roundToStep(base + PROGRESSION_INCREMENT_KG[half]),
    };
  }
  return { outcome: ProgressionOutcome.Hold, suggestedWeightKg: roundToStep(base) };
}
