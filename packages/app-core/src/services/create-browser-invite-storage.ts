import { INVITE_STORAGE_KEY } from '../config.ts';
import type { InviteStorage } from '../types.ts';

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Keeps the code in `localStorage` (or the given storage), so it survives the redirect to
 * Google and back. Storage can be missing or refuse access (private mode, quota, blocked
 * cookies); the code is then simply not remembered and the person enters it again.
 */
export function createBrowserInviteStorage(storage?: KeyValueStorage): InviteStorage {
  const attempt = <T>(action: (target: KeyValueStorage) => T): T | undefined => {
    try {
      const target = storage ?? globalThis.localStorage;
      return target ? action(target) : undefined;
    } catch {
      return undefined;
    }
  };
  return {
    get: () => attempt((target) => target.getItem(INVITE_STORAGE_KEY)) ?? undefined,
    save: (code) => void attempt((target) => target.setItem(INVITE_STORAGE_KEY, code)),
    clear: () => void attempt((target) => target.removeItem(INVITE_STORAGE_KEY)),
  };
}
