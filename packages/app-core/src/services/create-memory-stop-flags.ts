import type { Clearable, LocalStopFlag, StopFlagStore } from '../types.ts';

/** Lost on reload; Test and Dev modes. Production uses the Dexie stop flag store. */
export function createMemoryStopFlags(): StopFlagStore & Clearable {
  const rows = new Map<string, LocalStopFlag>();
  return {
    async add(report, reportedAt) {
      if (!rows.has(report.id)) rows.set(report.id, { report, reportedAt });
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
