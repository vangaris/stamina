import type Dexie from 'dexie';
import { LocalTable } from '../enums/local-table.ts';
import type { ActivityLogStore, ActivityRow } from '../types.ts';

/** The Activity log in IndexedDB. */
export function createDexieActivityLog(database: Dexie): ActivityLogStore {
  const table = database.table<ActivityRow, string>(LocalTable.Activities);
  return {
    async add(activity, recordedAt) {
      // The first row stays; check and write in one transaction so two calls cannot both win.
      await database.transaction('rw', table, async () => {
        if ((await table.get(activity.id)) === undefined) {
          await table.add({ id: activity.id, activity, recordedAt });
        }
      });
    },
    async remove(id) {
      await table.delete(id);
    },
    async list() {
      const rows = await table.toArray();
      return rows.map(({ activity, recordedAt }) => ({ activity, recordedAt }));
    },
  };
}
