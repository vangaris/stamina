import type { Clearable, LocalWater, WaterLogStore } from '../types.ts';

/** Lost on reload; Test and Dev modes. Production uses the Dexie water log. */
export function createMemoryWaterLog(): WaterLogStore & Clearable {
  const rows = new Map<string, LocalWater>();
  return {
    async add(water, recordedAt) {
      if (!rows.has(water.id)) rows.set(water.id, { water, recordedAt });
    },
    async remove(id) {
      rows.delete(id);
    },
    async list() {
      return [...rows.values()];
    },
    clear() {
      rows.clear();
    },
  };
}
