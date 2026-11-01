import { describe, expect, it } from 'vitest';
import { Eligibility } from '../enums/eligibility.ts';
import { checkEligibility } from './check-eligibility.ts';

const currentYear = 2026;

describe('checkEligibility', () => {
  it('admits an adult living in the EU', () => {
    expect(checkEligibility({ birthYear: 1990, country: 'GR', currentYear })).toBe(
      Eligibility.Eligible,
    );
  });

  it('admits an EEA resident outside the EU', () => {
    expect(checkEligibility({ birthYear: 1990, country: 'NO', currentYear })).toBe(
      Eligibility.Eligible,
    );
  });

  it('turns away someone whose age in years is 17, and admits 18', () => {
    expect(checkEligibility({ birthYear: 2009, country: 'GR', currentYear })).toBe(
      Eligibility.UnderAge,
    );
    expect(checkEligibility({ birthYear: 2008, country: 'GR', currentYear })).toBe(
      Eligibility.Eligible,
    );
  });

  it('turns away residents outside the EU/EEA, including the UK and Switzerland', () => {
    for (const country of ['US', 'GB', 'CH']) {
      expect(checkEligibility({ birthYear: 1990, country, currentYear })).toBe(
        Eligibility.OutsideEea,
      );
    }
  });

  it('reports a minor as under age before looking at the country', () => {
    expect(checkEligibility({ birthYear: 2015, country: 'US', currentYear })).toBe(
      Eligibility.UnderAge,
    );
  });
});
