import type {
  Checkin,
  ProgramWeek,
  SavedScreening,
  SessionDetail,
  WeekLoad,
} from '@stamina/contracts';
import type { StopState } from '@stamina/domain';
import type { Clearable, PlanCache } from '../types.ts';

/** Lost on reload; Test and Dev modes. Production uses the Dexie plan cache. */
export function createMemoryPlanCache(): PlanCache & Clearable {
  let program: ProgramWeek | undefined;
  let cleared: SavedScreening | undefined;
  let weekLoad: WeekLoad | undefined;
  let stop: StopState | undefined;
  let latestCheckin: Checkin | null | undefined;
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
      stop = undefined;
    },
    async saveStop(state) {
      stop = structuredClone(state);
    },
    async readStop() {
      return stop && structuredClone(stop);
    },
    async saveLatestCheckin(checkin) {
      latestCheckin = structuredClone(checkin);
    },
    async readLatestCheckin() {
      return latestCheckin && structuredClone(latestCheckin);
    },
    clear() {
      program = undefined;
      cleared = undefined;
      stop = undefined;
      latestCheckin = undefined;
      weekLoad = undefined;
      details.clear();
    },
  };
}
