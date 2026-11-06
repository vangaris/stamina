import { describe, expect, it } from 'vitest';
import { TEST_CLOCK } from '../config.ts';
import { createFixedClock } from './create-fixed-clock.ts';

describe('createFixedClock', () => {
  it('reads the same monotonic time and wall-clock time every call', () => {
    const clock = createFixedClock();

    expect(clock.now()).toBe(TEST_CLOCK.nowMs);
    expect(clock.now()).toBe(TEST_CLOCK.nowMs);
    expect(clock.wallTime().toISOString()).toBe(TEST_CLOCK.wallTime);
  });

  it('hands out a new Date each time, so a caller cannot move the clock', () => {
    const clock = createFixedClock();
    clock.wallTime().setUTCFullYear(1999);

    expect(clock.wallTime().toISOString()).toBe(TEST_CLOCK.wallTime);
  });
});
