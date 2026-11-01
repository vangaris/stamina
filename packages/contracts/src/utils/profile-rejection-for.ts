import { Eligibility } from '@stamina/domain';
import { ProfileRejection } from '../enums/profile-rejection.ts';

/** The rejection that answers an eligibility result; `undefined` when the person is eligible. */
export function profileRejectionFor(eligibility: Eligibility): ProfileRejection | undefined {
  switch (eligibility) {
    case Eligibility.UnderAge:
      return ProfileRejection.UnderAge;
    case Eligibility.OutsideEea:
      return ProfileRejection.OutsideEea;
    case Eligibility.Eligible:
      return undefined;
  }
}
