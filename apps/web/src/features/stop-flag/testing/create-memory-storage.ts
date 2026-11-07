import type { RecheckOwedStorage } from '../types.ts';

/** A `localStorage` that lives in memory, for tests; `data` is what it holds. */
export function createMemoryStorage(
  initial: Record<string, string> = {},
): RecheckOwedStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}
