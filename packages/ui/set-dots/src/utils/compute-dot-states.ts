import { SetDotState } from '../enums/set-dot-state.ts';

/**
 * One state per planned set. The first `done` sets are done (clamped to the total); `current`
 * marks the set in progress unless it is already done; the rest are pending. Non-finite counts
 * count as 0, and fractions round down.
 */
export function computeDotStates(total: number, done: number, current?: number): SetDotState[] {
  const count = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const finished = Number.isFinite(done) ? Math.min(count, Math.max(0, Math.floor(done))) : 0;
  return Array.from({ length: count }, (_, index) => {
    if (index < finished) return SetDotState.Done;
    return index === current ? SetDotState.Current : SetDotState.Pending;
  });
}
