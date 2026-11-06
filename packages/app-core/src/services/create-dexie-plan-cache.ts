import {
  programWeekSchema,
  savedScreeningSchema,
  sessionDetailSchema,
  weekLoadSchema,
} from '@stamina/contracts';
import { TrainingMode } from '@stamina/domain';
import type Dexie from 'dexie';
import { CACHE_KEY } from '../config.ts';
import { LocalTable } from '../enums/local-table.ts';
import type { CacheRow, PlanCache } from '../types.ts';

/**
 * The plan cache in IndexedDB. A cached value is parsed again on the way out: one an older app
 * version wrote in a different shape counts as not cached rather than reaching the screen.
 */
export function createDexiePlanCache(database: Dexie): PlanCache {
  const table = database.table<CacheRow, string>(LocalTable.Cache);
  const sessionKey = (sessionId: string) => `${CACHE_KEY.sessionDetailPrefix}${sessionId}`;
  return {
    async saveProgram(program) {
      await table.put({ key: CACHE_KEY.program, value: program });
    },
    async readProgram() {
      const parsed = programWeekSchema.safeParse((await table.get(CACHE_KEY.program))?.value);
      return parsed.success ? parsed.data : undefined;
    },
    async saveSessionDetail(detail) {
      await table.put({ key: sessionKey(detail.id), value: detail });
    },
    async readSessionDetail(sessionId) {
      const parsed = sessionDetailSchema.safeParse((await table.get(sessionKey(sessionId)))?.value);
      return parsed.success ? parsed.data : undefined;
    },
    async saveWeekLoad(week) {
      await table.put({ key: CACHE_KEY.weekLoad, value: week });
    },
    async readWeekLoad() {
      const parsed = weekLoadSchema.safeParse((await table.get(CACHE_KEY.weekLoad))?.value);
      return parsed.success ? parsed.data : undefined;
    },
    async saveClearedScreening(screening) {
      await table.put({ key: CACHE_KEY.clearedScreening, value: screening });
    },
    async readClearedScreening() {
      const parsed = savedScreeningSchema.safeParse(
        (await table.get(CACHE_KEY.clearedScreening))?.value,
      );
      return parsed.success && parsed.data.trainingMode !== TrainingMode.Referred
        ? parsed.data
        : undefined;
    },
    async deleteClearedScreening() {
      await table.delete(CACHE_KEY.clearedScreening);
    },
  };
}
