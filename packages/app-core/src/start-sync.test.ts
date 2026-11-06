import { afterEach, describe, expect, it, vi } from 'vitest';
import { startSync } from './start-sync.ts';
import type { IntervalTimer, SyncRunner } from './types.ts';

function setup(sync?: SyncRunner) {
  let calls = 0;
  const runner: SyncRunner =
    sync ??
    (async () => {
      calls += 1;
      return { replayed: 0, remaining: 0 };
    });
  const target = new EventTarget();
  const stop = startSync({ sync: runner, target });
  return { target, stop, calls: () => calls };
}

const RETRY_MS = 30_000;

/** A timer the test fires by hand, that records what it was asked and whether it was stopped. */
function manualTimer() {
  const callbacks: (() => void)[] = [];
  const requested: number[] = [];
  let stopped = 0;
  const timer: IntervalTimer = {
    every: (callback, ms) => {
      callbacks.push(callback);
      requested.push(ms);
      return () => {
        stopped += 1;
      };
    },
  };
  return {
    timer,
    fire: () => callbacks.forEach((callback) => callback()),
    requested,
    stopped: () => stopped,
  };
}

describe('startSync', () => {
  afterEach(() => vi.useRealTimers());

  it('syncs when the app opens, and on focus and online', () => {
    const { target, calls } = setup();
    expect(calls()).toBe(1);

    target.dispatchEvent(new Event('focus'));
    target.dispatchEvent(new Event('online'));

    expect(calls()).toBe(3);
  });

  it('ignores other events', () => {
    const { target, calls } = setup();

    target.dispatchEvent(new Event('offline'));
    target.dispatchEvent(new Event('blur'));

    expect(calls()).toBe(1);
  });

  it('stops listening when stopped', () => {
    const { target, stop, calls } = setup();

    stop();
    target.dispatchEvent(new Event('focus'));
    target.dispatchEvent(new Event('online'));

    expect(calls()).toBe(1);
  });

  it('survives a sync that rejects, and syncs again on the next trigger', async () => {
    let calls = 0;
    const { target } = setup(async () => {
      calls += 1;
      throw new Error('queue unreadable');
    });

    target.dispatchEvent(new Event('focus'));
    await Promise.resolve();

    expect(calls).toBe(2);
  });

  describe('retrying on a timer', () => {
    function withRetry() {
      let calls = 0;
      const sync: SyncRunner = async () => {
        calls += 1;
        return { replayed: 0, remaining: 0 };
      };
      const clock = manualTimer();
      const stop = startSync({
        sync,
        target: new EventTarget(),
        retryEveryMs: RETRY_MS,
        timer: clock.timer,
      });
      return { ...clock, stop, calls: () => calls };
    }

    it('syncs on every tick of the injected timer, at the interval asked for', () => {
      const { fire, requested, calls } = withRetry();
      expect(requested).toEqual([RETRY_MS]);
      expect(calls()).toBe(1);

      fire();
      fire();

      expect(calls()).toBe(3);
    });

    it('stops the timer when stopped', () => {
      const { stop, stopped } = withRetry();
      expect(stopped()).toBe(0);

      stop();

      expect(stopped()).toBe(1);
    });

    it('starts no timer without retryEveryMs', () => {
      const clock = manualTimer();
      startSync({
        sync: async () => ({ replayed: 0, remaining: 0 }),
        target: new EventTarget(),
        timer: clock.timer,
      });

      expect(clock.requested).toEqual([]);
    });

    it('retries on the system timer by default, and not once stopped', () => {
      vi.useFakeTimers();
      let calls = 0;
      const stop = startSync({
        sync: async () => {
          calls += 1;
          return { replayed: 0, remaining: 0 };
        },
        target: new EventTarget(),
        retryEveryMs: RETRY_MS,
      });
      vi.advanceTimersByTime(RETRY_MS * 2);
      expect(calls).toBe(3);

      stop();
      vi.advanceTimersByTime(RETRY_MS * 2);
      expect(calls).toBe(3);
    });

    it('survives a sync that rejects on a tick', () => {
      let calls = 0;
      const clock = manualTimer();
      startSync({
        sync: async () => {
          calls += 1;
          throw new Error('queue unreadable');
        },
        target: new EventTarget(),
        retryEveryMs: RETRY_MS,
        timer: clock.timer,
      });

      clock.fire();

      expect(calls).toBe(2);
    });
  });
});
