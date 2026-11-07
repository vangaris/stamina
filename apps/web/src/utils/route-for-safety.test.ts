import { SafetyStatus, type SafetyState } from '@stamina/app-core';
import type { SavedScreening } from '@stamina/contracts';
import {
  ConsentPurpose,
  ReferralKind,
  ScreeningStatus,
  StartingLevel,
  StopFlag,
  TrainingMode,
  type StopState,
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

const stop: StopState = { pausing: [], restOn: null, excludedAreas: [] };
const pausing: StopState = { ...stop, pausing: [StopFlag.ChestPain] };

describe('routeForSafety', () => {
  it.each<[string, SafetyState, RoutePath]>([
    ['no saved profile', { status: SafetyStatus.ProfileNeeded }, RoutePath.Onboarding],
    [
      'a missing consent',
      { status: SafetyStatus.ConsentNeeded, missing: [ConsentPurpose.HealthData] },
      RoutePath.Consent,
    ],
    ['no Screening yet', { status: SafetyStatus.ScreeningNeeded }, RoutePath.Screening],
    [
      'a referral',
      { status: SafetyStatus.Referred, screening: referred, stop },
      RoutePath.Referred,
    ],
    [
      'a pause after a stop flag',
      { status: SafetyStatus.Paused, screening, stop: pausing },
      RoutePath.Paused,
    ],
    ['being ready', { status: SafetyStatus.Ready, screening, stop }, RoutePath.Today],
  ])('sends %s to %s', (_name, state, path) => {
    expect(routeForSafety(state)).toBe(path);
  });
});
