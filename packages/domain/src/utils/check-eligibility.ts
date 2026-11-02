import { ADULT_AGE, EEA_COUNTRY_CODES } from '../config.ts';
import { Eligibility } from '../enums/eligibility.ts';
import type { EligibilityInput } from '../types.ts';

/**
 * Whether someone may start. Age is checked first so a minor is never asked about, or told
 * anything about, where they live. Age is year-based: birth year is all Stamina asks for.
 */
export function checkEligibility({
  birthYear,
  country,
  currentYear,
}: EligibilityInput): Eligibility {
  if (currentYear - birthYear < ADULT_AGE) return Eligibility.UnderAge;
  if (!EEA_COUNTRY_CODES.includes(country)) return Eligibility.OutsideEea;
  return Eligibility.Eligible;
}
