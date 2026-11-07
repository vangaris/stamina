import type { StoredStopFlag } from '@stamina/domain';
import type { LocalStopFlag } from '../types.ts';

/** A flag still waiting on this device, as the stop rules read it: open (the server has not confirmed it). */
export function toStoredStopFlag({ report, reportedAt }: LocalStopFlag): StoredStopFlag {
  return {
    flag: report.flag,
    date: report.date,
    area: report.bodyArea ?? null,
    reportedAt,
    confirmedAt: null,
  };
}
