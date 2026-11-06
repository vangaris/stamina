import { createServices, ServicesMode, SyncTrigger, type OfflineQueue } from '@stamina/app-core';
import { describe, expect, it, vi } from 'vitest';
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

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('startAppSync', () => {
  it('syncs when the app opens, on focus and when the phone is back online', async () => {
    const { reads, target } = setup();
    await settle();
    const afterOpen = reads();
    expect(afterOpen).toBeGreaterThan(0);

    target.dispatchEvent(new Event(SyncTrigger.Focus));
    await settle();
    const afterFocus = reads();
    expect(afterFocus).toBeGreaterThan(afterOpen);

    target.dispatchEvent(new Event(SyncTrigger.Online));
    await settle();
    expect(reads()).toBeGreaterThan(afterFocus);
  });

  it('stops syncing once stopped', async () => {
    const { reads, target, stop } = setup();
    await settle();
    const before = reads();

    stop();
    target.dispatchEvent(new Event(SyncTrigger.Online));
    await settle();

    expect(reads()).toBe(before);
  });
});
