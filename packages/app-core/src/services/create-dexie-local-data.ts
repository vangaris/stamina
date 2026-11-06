import type Dexie from 'dexie';
import { OWNER_KEY } from '../config.ts';
import { LocalTable } from '../enums/local-table.ts';
import type { LocalData, OwnerRow } from '../types.ts';

/**
 * Every table of the database in one transaction, so a wipe is all or nothing and a table added
 * later is cleared too. The owner is one row in its own table, written in the same transaction as
 * the wipe it follows.
 */
export function createDexieLocalData(database: Dexie): LocalData {
  const owner = database.table<OwnerRow, string>(LocalTable.Owner);
  const clearAll = () => Promise.all(database.tables.map((table) => table.clear()));
  return {
    async clear() {
      await database.transaction('rw', database.tables, clearAll);
    },
    async claim(userId) {
      await database.transaction('rw', database.tables, async () => {
        if ((await owner.get(OWNER_KEY))?.userId === userId) return;
        await clearAll();
        await owner.put({ key: OWNER_KEY, userId });
      });
    },
  };
}
