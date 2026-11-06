import type { ProgramWeek, SavedScreening, SessionDetail, WeekLoad } from '@stamina/contracts';
import type { Clearable, PlanCache } from '../types.ts';

/** Lost on reload; Test and Dev modes. Production uses the Dexie plan cache. */
export function createMemoryPlanCache(): PlanCache & Clearable {
  let program: ProgramWeek | undefined;
  let cleared: SavedScreening | undefined;
  let weekLoad: WeekLoad | undefined;
  const details = new Map<string, SessionDetail>();
  return {
    async saveProgram(week) {
      program = structuredClone(week);
    },
    async readProgram() {
      return program && structuredClone(program);
    },
    async saveSessionDetail(detail) {
      details.set(detail.id, structuredClone(detail));
    },
    async readSessionDetail(sessionId) {
      const detail = details.get(sessionId);
      return detail && structuredClone(detail);
    },
    async saveWeekLoad(week) {
      weekLoad = structuredClone(week);
    },
    async readWeekLoad() {
      return weekLoad && structuredClone(weekLoad);
    },
    async saveClearedScreening(screening) {
      cleared = structuredClone(screening);
    },
    async readClearedScreening() {
      return cleared && structuredClone(cleared);
    },
    async deleteClearedScreening() {
      cleared = undefined;
    },
    clear() {
      program = undefined;
      cleared = undefined;
      weekLoad = undefined;
      details.clear();
    },
  };
}
