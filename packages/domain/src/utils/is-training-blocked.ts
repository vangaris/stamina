import type { StopState } from '../types.ts';

/** Training is blocked on `date` (`YYYY-MM-DD`) while a stop flag pauses it, and on the day of a fever. */
export function isTrainingBlocked(state: StopState, date: string): boolean {
  return state.pausing.length > 0 || state.restOn === date;
}
