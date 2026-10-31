import type { OfflineQueue, Request } from '../types.ts';

/** Lost on reload; an IndexedDB adapter replaces it in a later ticket. */
export function createMemoryOfflineQueue(): OfflineQueue {
  const requests: Request[] = [];
  return {
    async enqueue(request) {
      requests.push(request);
    },
    async pending() {
      return [...requests];
    },
  };
}
