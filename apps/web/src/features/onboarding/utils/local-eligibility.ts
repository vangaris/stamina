import { checkEligibility, Eligibility } from '@stamina/domain';
import type { OnboardingDraft } from '../types.ts';
import { parseBirthYear } from './parse-birth-year.ts';

/**
 * What the domain's rule says about the answers so far, asked on the device so a person who
 * cannot use Stamina is told before anything is sent. `undefined` while it cannot be decided:
 * the birth year is not usable, or the person is an adult who has not picked a country yet.
 * Age is decided first, so a minor is stopped even before choosing a country.
 */
export function localEligibility(
  draft: Pick<OnboardingDraft, 'birthYear' | 'country'>,
  currentYear: number,
): Eligibility | undefined {
  const birthYear = parseBirthYear(draft.birthYear, currentYear);
  if (birthYear === undefined) return undefined;
  const eligibility = checkEligibility({ birthYear, country: draft.country, currentYear });
  if (eligibility === Eligibility.OutsideEea && draft.country === '') return undefined;
  return eligibility;
}
