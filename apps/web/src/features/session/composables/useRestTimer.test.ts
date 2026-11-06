import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RestClock } from '../types.ts';
import { useRestTimer } from './useRestTimer.ts';

describe('useRestTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('counts down a second at a time and ends when it reaches zero', () => {
    const onEnd = vi.fn();
    const timer = useRestTimer({ onEnd });

    timer.start(3);
    expect(timer.active.value).toBe(true);
    expect([timer.remaining.value, timer.total.value]).toEqual([3, 3]);

    vi.advanceTimersByTime(1000);
    expect(timer.remaining.value).toBe(2);
    vi.advanceTimersByTime(2000);

    expect(timer.remaining.value).toBe(0);
    expect(timer.active.value).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('ends at once when skipped, and only once', () => {
    const onEnd = vi.fn();
    const timer = useRestTimer({ onEnd });
    timer.start(60);

    timer.skip();
    timer.skip();
    vi.advanceTimersByTime(60_000);

    expect(timer.active.value).toBe(false);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('does nothing when skipped or extended without a rest running', () => {
    const onEnd = vi.fn();
    const timer = useRestTimer({ onEnd });

    timer.skip();
    timer.add(15);

    expect(onEnd).not.toHaveBeenCalled();
    expect(timer.remaining.value).toBe(0);
  });

  it('adds time to the running rest and grows the total with it', () => {
    const timer = useRestTimer({ onEnd: vi.fn() });
    timer.start(10);
    vi.advanceTimersByTime(2000);

    timer.add(15);

    expect(timer.remaining.value).toBe(23);
    expect(timer.total.value).toBe(23);
  });

  it('starts a new rest over an old one without ending it', () => {
    const onEnd = vi.fn();
    const timer = useRestTimer({ onEnd });
    timer.start(30);
    vi.advanceTimersByTime(5000);

    timer.start(90);

    expect(timer.remaining.value).toBe(90);
    vi.advanceTimersByTime(30_000);
    expect(timer.remaining.value).toBe(60);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('stops without ending when stopped', () => {
    const onEnd = vi.fn();
    const timer = useRestTimer({ onEnd });
    timer.start(5);

    timer.stop();
    vi.advanceTimersByTime(10_000);

    expect(timer.active.value).toBe(false);
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('reads the clock instead of counting ticks, so time passed while asleep is not lost', () => {
    let now = 0;
    let tick: () => void = () => undefined;
    const clock: RestClock = {
      now: () => now,
      every: (callback) => {
        tick = callback;
        return () => undefined;
      },
    };
    const timer = useRestTimer({ onEnd: vi.fn(), clock });
    timer.start(120);

    now = 90_000; // the phone slept for 90 s: one tick arrives late
    tick();

    expect(timer.remaining.value).toBe(30);
  });
});
