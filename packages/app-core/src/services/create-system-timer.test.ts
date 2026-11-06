import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSystemTimer } from './create-system-timer.ts';

const EVERY_MS = 1000;

describe('createSystemTimer', () => {
  afterEach(() => vi.useRealTimers());

  it('calls back every interval until stopped', () => {
    vi.useFakeTimers();
    let calls = 0;

    const stop = createSystemTimer().every(() => (calls += 1), EVERY_MS);
    vi.advanceTimersByTime(EVERY_MS * 3);
    expect(calls).toBe(3);

    stop();
    vi.advanceTimersByTime(EVERY_MS * 3);
    expect(calls).toBe(3);
  });
});
