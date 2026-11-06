import { SafetyStatus, type SafetyState } from '@stamina/app-core';

/** Whether `today` (`YYYY-MM-DD`) is the day of a reported fever: no training today. */
export function isRestDay(state: SafetyState, today: string): boolean {
  switch (state.status) {
    case SafetyStatus.Ready:
    case SafetyStatus.Referred:
    case SafetyStatus.Paused:
      return state.stop.restOn === today;
    default:
      return false;
  }
}
