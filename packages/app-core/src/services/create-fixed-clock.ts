import { TEST_CLOCK } from '../config.ts';
import type { Clock } from '../types.ts';

/** Test mode: time never moves, so durations are 0 and recorded moments are `TEST_CLOCK.wallTime`. */
export function createFixedClock(): Clock {
  return { now: () => TEST_CLOCK.nowMs, wallTime: () => new Date(TEST_CLOCK.wallTime) };
}
