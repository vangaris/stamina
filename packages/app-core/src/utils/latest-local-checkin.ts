import type { LocalCheckin } from '../types.ts';

/** The Check-in with the latest day, ties broken by `recordedAt`; null for none. */
export function latestLocalCheckin(rows: readonly LocalCheckin[]): LocalCheckin | null {
  let latest: LocalCheckin | null = null;
  for (const row of rows) {
    if (
      latest === null ||
      row.checkin.date > latest.checkin.date ||
      (row.checkin.date === latest.checkin.date && row.recordedAt > latest.recordedAt)
    ) {
      latest = row;
    }
  }
  return latest;
}
