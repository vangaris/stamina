import type Dexie from 'dexie';
import { LocalTable } from '../enums/local-table.ts';
import type { WaterLogStore, WaterRow } from '../types.ts';

/** The water log in IndexedDB. */
export function createDexieWaterLog(database: Dexie): WaterLogStore {
  const table = database.table<WaterRow, string>(LocalTable.WaterLogs);
  return {
    async add(water, recordedAt) {
      // The first row stays; check and write in one transaction so two calls cannot both win.
      await database.transaction('rw', table, async () => {
        if ((await table.get(water.id)) === undefined) {
          await table.add({ id: water.id, water, recordedAt });
        }
      });
    },
    async remove(id) {
      await table.delete(id);
    },
    async list() {
      const rows = await table.toArray();
      return rows.map(({ water, recordedAt }) => ({ water, recordedAt }));
    },
  };
}
