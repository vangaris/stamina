import { SWAP_STORAGE_PREFIX } from '../config.ts';
import type { SwapStorage, SwapStore, Swaps } from '../types.ts';

function parseSwaps(raw: string | null): Swaps {
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

/**
 * Keeps the person's swaps for each Session in `storage`, so a reload during the Session keeps
 * them. Storage that is missing, full or blocked (private browsing) is not an error: a swap then
 * lasts until the page is closed.
 */
export function createSwapStore(storage: SwapStorage): SwapStore {
  const key = (sessionId: string) => `${SWAP_STORAGE_PREFIX}${sessionId}`;
  return {
    read(sessionId) {
      try {
        return parseSwaps(storage.getItem(key(sessionId)));
      } catch {
        return {};
      }
    },
    write(sessionId, swaps) {
      try {
        if (Object.keys(swaps).length === 0) storage.removeItem(key(sessionId));
        else storage.setItem(key(sessionId), JSON.stringify(swaps));
      } catch {
        // Nowhere to keep it: the swap still holds for this page.
      }
    },
    clear(sessionId) {
      try {
        storage.removeItem(key(sessionId));
      } catch {
        // Nothing was kept.
      }
    },
  };
}
