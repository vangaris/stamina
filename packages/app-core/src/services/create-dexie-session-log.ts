import type Dexie from 'dexie';
import { LocalTable } from '../enums/local-table.ts';
import type { FinishRow, SessionLogStore, SetRow } from '../types.ts';

/** The session log in IndexedDB. */
export function createDexieSessionLog(database: Dexie): SessionLogStore {
  const sets = database.table<SetRow, string>(LocalTable.Sets);
  const finishes = database.table<FinishRow, string>(LocalTable.Finishes);
  return {
    async addSet(sessionId, set) {
      await sets.put({ id: set.id, sessionId, set });
    },
    async removeSet(setId) {
      await sets.delete(setId);
    },
    async recordFinish(sessionId, finish) {
      // The first finish stays; check and write in one transaction so two calls cannot both win.
      await database.transaction('rw', finishes, async () => {
        if ((await finishes.get(sessionId)) === undefined) {
          await finishes.add({ sessionId, ...finish });
        }
      });
    },
    async removeFinish(sessionId, finishId) {
      await database.transaction('rw', finishes, async () => {
        if ((await finishes.get(sessionId))?.finish.id === finishId) {
          await finishes.delete(sessionId);
        }
      });
    },
    async read(sessionId) {
      const [setRows, finishRow] = await Promise.all([
        sets.where('sessionId').equals(sessionId).toArray(),
        finishes.get(sessionId),
      ]);
      return {
        sets: setRows.map(({ set }) => set),
        finish: finishRow ? { finish: finishRow.finish, recordedAt: finishRow.recordedAt } : null,
      };
    },
  };
}
