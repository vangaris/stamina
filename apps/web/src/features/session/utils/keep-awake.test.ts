import { describe, expect, it } from 'vitest';
import { DocumentEvent } from '../enums/document-event.ts';
import { VisibilityState } from '../enums/visibility-state.ts';
import { WakeLockType } from '../enums/wake-lock-type.ts';
import type { WakeLockDocument } from '../types.ts';
import { keepAwake } from './keep-awake.ts';

class FakeSentinel {
  released = false;
  async release() {
    this.released = true;
  }
}

function setup({ supported = true, refuse = false } = {}) {
  const sentinels: FakeSentinel[] = [];
  const requests: string[] = [];
  const listeners = new Set<() => void>();
  const document: WakeLockDocument & { visibilityState: string } = {
    visibilityState: VisibilityState.Visible,
    addEventListener: (type, listener) => {
      if (type === DocumentEvent.VisibilityChange) listeners.add(listener);
    },
    removeEventListener: (type, listener) => {
      if (type === DocumentEvent.VisibilityChange) listeners.delete(listener);
    },
  };
  const navigator = {
    wakeLock: supported
      ? {
          request: async (type: WakeLockType) => {
            requests.push(type);
            if (refuse) throw new DOMException('refused', 'NotAllowedError');
            const sentinel = new FakeSentinel();
            sentinels.push(sentinel);
            return sentinel as unknown as WakeLockSentinel;
          },
        }
      : undefined,
  };
  const release = keepAwake({ navigator, document });
  /** The page goes to the background (the browser releases the lock) and comes back. */
  async function hideAndShow() {
    document.visibilityState = VisibilityState.Hidden;
    sentinels.forEach((sentinel) => (sentinel.released = true));
    listeners.forEach((listener) => listener());
    document.visibilityState = VisibilityState.Visible;
    listeners.forEach((listener) => listener());
    await Promise.resolve();
    await Promise.resolve();
  }
  return { release, sentinels, requests, listeners, hideAndShow };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('keepAwake', () => {
  it('requests a screen wake lock', async () => {
    const { requests, sentinels } = setup();
    await settle();

    expect(requests).toEqual([WakeLockType.Screen]);
    expect(sentinels).toHaveLength(1);
  });

  it('asks again when the page returns, because hiding it released the lock', async () => {
    const { requests, hideAndShow } = setup();
    await settle();

    await hideAndShow();
    await settle();

    expect(requests).toHaveLength(2);
  });

  it('does not ask again while it still holds the lock', async () => {
    const { requests, listeners } = setup();
    await settle();

    listeners.forEach((listener) => listener());
    await settle();

    expect(requests).toHaveLength(1);
  });

  it('lets go and stops listening when released', async () => {
    const { release, sentinels, listeners } = setup();
    await settle();

    release();

    expect(sentinels[0]?.released).toBe(true);
    expect(listeners.size).toBe(0);
  });

  it('lets go of a lock that arrives after the release', async () => {
    const { release, sentinels } = setup();

    release();
    await settle();

    expect(sentinels[0]?.released).toBe(true);
  });

  it('does nothing where wake lock is not supported', async () => {
    const { release, listeners, requests } = setup({ supported: false });
    await settle();

    expect(requests).toEqual([]);
    expect(listeners.size).toBe(0);
    expect(() => release()).not.toThrow();
  });

  it('carries on quietly when the browser refuses', async () => {
    const { release } = setup({ refuse: true });
    await settle();

    expect(() => release()).not.toThrow();
  });
});
