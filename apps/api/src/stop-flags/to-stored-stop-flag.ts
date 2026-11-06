import type { StoredStopFlag } from '@stamina/domain';
import type { StopFlagRow } from './types.ts';

/** A stored stop flag row as the domain's `StoredStopFlag`. */
export function toStoredStopFlag(row: StopFlagRow): StoredStopFlag {
  return {
    flag: row.flag,
    date: row.date,
    area: row.bodyArea,
    reportedAt: row.reportedAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
  };
}
