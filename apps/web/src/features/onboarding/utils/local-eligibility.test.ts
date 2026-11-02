import { Eligibility } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { localEligibility } from './local-eligibility.ts';

const NOW = 2026;

describe('localEligibility', () => {
  it('stops someone under 18 even before a country is chosen, and before looking at the country', () => {
    expect(localEligibility({ birthYear: '2010', country: '' }, NOW)).toBe(Eligibility.UnderAge);
    expect(localEligibility({ birthYear: '2010', country: 'US' }, NOW)).toBe(Eligibility.UnderAge);
  });

  it('counts age by year: 18 years since the birth year is an adult', () => {
    expect(localEligibility({ birthYear: '2008', country: 'GR' }, NOW)).toBe(Eligibility.Eligible);
    expect(localEligibility({ birthYear: '2009', country: 'GR' }, NOW)).toBe(Eligibility.UnderAge);
  });

  it('stops an adult outside the EU/EEA once a country is chosen', () => {
    expect(localEligibility({ birthYear: '1990', country: 'US' }, NOW)).toBe(
      Eligibility.OutsideEea,
    );
  });

  it('lets an adult in the EU/EEA through', () => {
    expect(localEligibility({ birthYear: '1990', country: 'PT' }, NOW)).toBe(Eligibility.Eligible);
  });

  it('cannot decide while the birth year is unusable or an adult has no country yet', () => {
    expect(localEligibility({ birthYear: '19', country: 'GR' }, NOW)).toBeUndefined();
    expect(localEligibility({ birthYear: '1990', country: '' }, NOW)).toBeUndefined();
  });
});
