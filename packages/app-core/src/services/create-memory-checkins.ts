import type { CheckinStore, Clearable, LocalCheckin } from '../types.ts';
import { latestLocalCheckin } from '../utils/latest-local-checkin.ts';

/** Lost on reload; Test and Dev modes. Production uses the Dexie Check-in store. */
export function createMemoryCheckins(): CheckinStore & Clearable {
  const rows = new Map<string, LocalCheckin>();
  return {
    async add(checkin, recordedAt) {
      if (!rows.has(checkin.id)) rows.set(checkin.id, { checkin, recordedAt });
    },
    async remove(id) {
      rows.delete(id);
    },
    async latest() {
      return latestLocalCheckin([...rows.values()]);
    },
    clear() {
      rows.clear();
    },
  };
}
