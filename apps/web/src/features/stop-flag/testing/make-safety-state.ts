import type { SavedScreening } from '@stamina/contracts';
import { ScreeningStatus, StartingLevel, TrainingMode, type StopState } from '@stamina/domain';

/** A Screening that allows full training. */
export function makeScreening(overrides: Partial<SavedScreening> = {}): SavedScreening {
  return {
    status: ScreeningStatus.Cleared,
    referral: null,
    nutritionOff: false,
    excludedAreas: [],
    startingLevel: StartingLevel.Beginner,
    trainingMode: TrainingMode.Full,
    takenAt: '2026-11-02T10:00:00.000Z',
    doctorOkAt: null,
    ...overrides,
  };
}

/** A stop state with nothing reported. */
export function makeStop(overrides: Partial<StopState> = {}): StopState {
  return { pausing: [], restOn: null, excludedAreas: [], ...overrides };
}
