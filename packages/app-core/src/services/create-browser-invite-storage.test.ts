import { describe, expect, it } from 'vitest';
import { INVITE_STORAGE_KEY } from '../config.ts';
import { createBrowserInviteStorage } from './create-browser-invite-storage.ts';

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe('createBrowserInviteStorage', () => {
  it('remembers a code until it is cleared, under one key', () => {
    const storage = memoryStorage();
    const invites = createBrowserInviteStorage(storage);

    expect(invites.get()).toBeUndefined();
    invites.save('KWDMX7PQ4R');
    expect(invites.get()).toBe('KWDMX7PQ4R');
    expect([...storage.items.keys()]).toEqual([INVITE_STORAGE_KEY]);

    invites.clear();
    expect(invites.get()).toBeUndefined();
  });

  it('is shared by two instances over the same storage, like a page reload', () => {
    const storage = memoryStorage();
    createBrowserInviteStorage(storage).save('KWDMX7PQ4R');

    expect(createBrowserInviteStorage(storage).get()).toBe('KWDMX7PQ4R');
  });

  it('forgets quietly when the storage refuses access', () => {
    const refusing = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
      removeItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    };
    const invites = createBrowserInviteStorage(refusing);

    expect(() => invites.save('KWDMX7PQ4R')).not.toThrow();
    expect(invites.get()).toBeUndefined();
    expect(() => invites.clear()).not.toThrow();
  });
});
