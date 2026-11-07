import type Dexie from 'dexie';
import { LocalTable } from '../enums/local-table.ts';
import type { MealLogRow, MealLogStore } from '../types.ts';

/** The meal log in IndexedDB. */
export function createDexieMealLogs(database: Dexie): MealLogStore {
  const table = database.table<MealLogRow, string>(LocalTable.MealLogs);
  return {
    async add(meal, recordedAt) {
      // The first row stays; check and write in one transaction so two calls cannot both win.
      await database.transaction('rw', table, async () => {
        if ((await table.get(meal.id)) === undefined) {
          await table.add({ id: meal.id, meal, recordedAt });
        }
      });
    },
    async remove(id) {
      await table.delete(id);
    },
    async list() {
      const rows = await table.toArray();
      return rows.map(({ meal, recordedAt }) => ({ meal, recordedAt }));
    },
  };
}
