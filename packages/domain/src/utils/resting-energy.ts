import { RESTING_SEX_CONSTANT } from '../config.ts';
import type { RestingEnergyInput } from '../types.ts';

/** Resting energy in kcal/day (Mifflin-St Jeor), unrounded. */
export function restingEnergy({ sex, ageYears, heightCm, weightKg }: RestingEnergyInput): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + RESTING_SEX_CONSTANT[sex];
}
