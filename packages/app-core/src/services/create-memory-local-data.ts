import type { Clearable, LocalData } from '../types.ts';

/** Lost on reload; Test and Dev modes. Production uses the Dexie local data. Clears the in-memory stores it is given. */
export function createMemoryLocalData(stores: readonly Clearable[]): LocalData {
  let owner: string | undefined;
  const clear = () => {
    for (const store of stores) store.clear();
    owner = undefined;
  };
  return {
    async clear() {
      clear();
    },
    async claim(userId) {
      if (owner === userId) return;
      clear();
      owner = userId;
    },
  };
}
