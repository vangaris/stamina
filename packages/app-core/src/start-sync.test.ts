import { describe, expect, it } from 'vitest';
import { startSync } from './start-sync.ts';
import type { SyncRunner } from './types.ts';

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

describe('startSync', () => {
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
});
