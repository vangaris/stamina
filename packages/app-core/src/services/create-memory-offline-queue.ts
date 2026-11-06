import type { Clearable, OfflineQueue, QueuedRequest } from '../types.ts';

/** Lost on reload; Test and Dev modes. Production uses the Dexie queue. */
export function createMemoryOfflineQueue(): OfflineQueue & Clearable {
  const entries: QueuedRequest[] = [];
  let nextId = 1;
  return {
    async enqueue(request) {
      entries.push({ id: nextId, request });
      nextId += 1;
    },
    async pending() {
      return [...entries];
    },
    async remove(id) {
      const index = entries.findIndex((entry) => entry.id === id);
      if (index !== -1) entries.splice(index, 1);
    },
    clear() {
      entries.length = 0;
    },
  };
}
