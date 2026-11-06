import { createServices, ServicesMode, SyncTrigger, type OfflineQueue } from '@stamina/app-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SYNC_RETRY_MS } from '../config.ts';
import { startAppSync } from './start-app-sync.ts';

const stores = { health: { set: () => undefined }, session: { set: () => undefined } };

/** Every sync reads the offline queue, so the reads tell how often it ran. */
function setup() {
  const pending = vi.fn<OfflineQueue['pending']>(async () => []);
  const services = {
    ...createServices({ mode: ServicesMode.Test }),
    offlineQueue: { enqueue: async () => undefined, remove: async () => undefined, pending },
  };
  const target = new EventTarget();
  const stop = startAppSync({ services, stores, target });
  return { reads: () => pending.mock.calls.length, target, stop };
}

describe('startAppSync', () => {
  afterEach(() => vi.useRealTimers());

  it('syncs when the app opens, on focus and when the phone is back online', async () => {
    vi.useFakeTimers();
    const { reads, target } = setup();
    await vi.advanceTimersByTimeAsync(0);
    const afterOpen = reads();
    expect(afterOpen).toBeGreaterThan(0);

    target.dispatchEvent(new Event(SyncTrigger.Focus));
    await vi.advanceTimersByTimeAsync(0);
    const afterFocus = reads();
    expect(afterFocus).toBeGreaterThan(afterOpen);

    target.dispatchEvent(new Event(SyncTrigger.Online));
    await vi.advanceTimersByTimeAsync(0);
    expect(reads()).toBeGreaterThan(afterFocus);
  });

  it('syncs again every retry interval while open, with no event', async () => {
    vi.useFakeTimers();
    const { reads } = setup();
    await vi.advanceTimersByTimeAsync(0);
    const afterOpen = reads();

    await vi.advanceTimersByTimeAsync(SYNC_RETRY_MS - 1);
    expect(reads()).toBe(afterOpen);
    await vi.advanceTimersByTimeAsync(1);
    const afterOne = reads();
    expect(afterOne).toBeGreaterThan(afterOpen);

    await vi.advanceTimersByTimeAsync(SYNC_RETRY_MS);
    expect(reads()).toBeGreaterThan(afterOne);
  });

  it('stops syncing, on events and on the timer, once stopped', async () => {
    vi.useFakeTimers();
    const { reads, target, stop } = setup();
    await vi.advanceTimersByTimeAsync(0);
    const before = reads();

    stop();
    target.dispatchEvent(new Event(SyncTrigger.Online));
    await vi.advanceTimersByTimeAsync(SYNC_RETRY_MS * 3);

    expect(reads()).toBe(before);
  });
});
