import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrowserClock } from './create-browser-clock.ts';

describe('createBrowserClock', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('reads the current time', () => {
    vi.setSystemTime(5000);

    expect(createBrowserClock().now()).toBe(5000);
  });

  it('calls back on every interval until stopped', () => {
    const calls = vi.fn();
    const stop = createBrowserClock().every(calls, 1000);

    vi.advanceTimersByTime(3000);
    stop();
    vi.advanceTimersByTime(3000);

    expect(calls).toHaveBeenCalledTimes(3);
  });
});
