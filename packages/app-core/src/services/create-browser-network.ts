import type { Network } from '../types.ts';

/** `navigator.onLine`; assumed online where there is no `navigator`. */
export function createBrowserNetwork(): Network {
  return { isOnline: () => globalThis.navigator?.onLine ?? true };
}
