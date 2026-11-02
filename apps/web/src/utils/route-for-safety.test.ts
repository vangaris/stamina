import { SafetyStatus, type SafetyState } from '@stamina/app-core';
import type { SavedScreening } from '@stamina/contracts';
import {
  ConsentPurpose,
  ReferralKind,
  ScreeningStatus,
  StartingLevel,
  TrainingMode,
} from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { RoutePath } from '../enums/route-path.ts';
import { routeForSafety } from './route-for-safety.ts';

const screening: SavedScreening = {
  status: ScreeningStatus.Cleared,
  referral: null,
  nutritionOff: false,
  excludedAreas: [],
  startingLevel: StartingLevel.Beginner,
  trainingMode: TrainingMode.Full,
  takenAt: '2026-11-02T10:00:00.000Z',
  doctorOkAt: null,
};
const referred: SavedScreening = {
  ...screening,
  status: ScreeningStatus.Referred,
  referral: ReferralKind.General,
  trainingMode: TrainingMode.Referred,
};

describe('routeForSafety', () => {
  it.each<[string, SafetyState, RoutePath]>([
    ['no saved profile', { status: SafetyStatus.ProfileNeeded }, RoutePath.Onboarding],
    [
      'a missing consent',
      { status: SafetyStatus.ConsentNeeded, missing: [ConsentPurpose.HealthData] },
      RoutePath.Consent,
    ],
    ['no Screening yet', { status: SafetyStatus.ScreeningNeeded }, RoutePath.Screening],
    ['a referral', { status: SafetyStatus.Referred, screening: referred }, RoutePath.Referred],
    ['being ready', { status: SafetyStatus.Ready, screening }, RoutePath.Today],
  ])('sends %s to %s', (_name, state, path) => {
    expect(routeForSafety(state)).toBe(path);
  });
});
