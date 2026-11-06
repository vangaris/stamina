import type Dexie from 'dexie';
import { LocalTable } from '../enums/local-table.ts';
import type { CheckinRow, CheckinStore } from '../types.ts';
import { latestLocalCheckin } from '../utils/latest-local-checkin.ts';

/** The Check-in store in IndexedDB. */
export function createDexieCheckins(database: Dexie): CheckinStore {
  const table = database.table<CheckinRow, string>(LocalTable.Checkins);
  return {
    async add(checkin, recordedAt) {
      // The first row stays; check and write in one transaction so two calls cannot both win.
      await database.transaction('rw', table, async () => {
        if ((await table.get(checkin.id)) === undefined) {
          await table.add({ id: checkin.id, checkin, recordedAt });
        }
      });
    },
    async remove(id) {
      await table.delete(id);
    },
    async latest() {
      const rows = await table.toArray();
      return latestLocalCheckin(rows.map(({ checkin, recordedAt }) => ({ checkin, recordedAt })));
    },
  };
}
