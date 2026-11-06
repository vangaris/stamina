import type Dexie from 'dexie';
import { LocalTable } from '../enums/local-table.ts';
import type { OfflineQueue, QueueRow } from '../types.ts';

/** The queue in IndexedDB: auto-increment keys give insertion order and it survives a reload. */
export function createDexieOfflineQueue(database: Dexie): OfflineQueue {
  const table = database.table<QueueRow, number>(LocalTable.Queue);
  return {
    async enqueue(request) {
      await table.add({ request });
    },
    async pending() {
      const rows = await table.orderBy(':id').toArray();
      return rows.flatMap(({ id, request }) => (id === undefined ? [] : [{ id, request }]));
    },
    async remove(id) {
      await table.delete(id);
    },
  };
}
