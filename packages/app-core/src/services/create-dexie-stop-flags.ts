import type Dexie from 'dexie';
import { LocalTable } from '../enums/local-table.ts';
import type { StopFlagRow, StopFlagStore } from '../types.ts';

/** The stop flag store in IndexedDB. */
export function createDexieStopFlags(database: Dexie): StopFlagStore {
  const table = database.table<StopFlagRow, string>(LocalTable.StopFlags);
  return {
    async add(report, reportedAt) {
      // The first row stays; check and write in one transaction so two calls cannot both win.
      await database.transaction('rw', table, async () => {
        if ((await table.get(report.id)) === undefined) {
          await table.add({ id: report.id, report, reportedAt });
        }
      });
    },
    async remove(id) {
      await table.delete(id);
    },
    async list() {
      const rows = await table.toArray();
      return rows.map(({ report, reportedAt }) => ({ report, reportedAt }));
    },
  };
}
