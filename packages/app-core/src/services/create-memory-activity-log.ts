import type { ActivityLogStore, Clearable, LocalActivity } from '../types.ts';

/** Lost on reload; Test and Dev modes. Production uses the Dexie Activity log. */
export function createMemoryActivityLog(): ActivityLogStore & Clearable {
  const rows = new Map<string, LocalActivity>();
  return {
    async add(activity, recordedAt) {
      if (!rows.has(activity.id)) rows.set(activity.id, { activity, recordedAt });
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
