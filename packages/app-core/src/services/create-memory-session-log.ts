import type { LogSet } from '@stamina/contracts';
import type { Clearable, LocalFinish, SessionLogStore } from '../types.ts';

/** Lost on reload; Test and Dev modes. Production uses the Dexie session log. */
export function createMemorySessionLog(): SessionLogStore & Clearable {
  /** Set id -> set and its Session. */
  const sets = new Map<string, { sessionId: string; set: LogSet }>();
  const finishes = new Map<string, LocalFinish>();
  return {
    async addSet(sessionId, set) {
      sets.set(set.id, { sessionId, set });
    },
    async removeSet(setId) {
      sets.delete(setId);
    },
    async recordFinish(sessionId, finish) {
      if (!finishes.has(sessionId)) finishes.set(sessionId, finish);
    },
    async read(sessionId) {
      return {
        sets: [...sets.values()].filter((row) => row.sessionId === sessionId).map(({ set }) => set),
        finish: finishes.get(sessionId) ?? null,
      };
    },
    clear() {
      sets.clear();
      finishes.clear();
    },
  };
}
