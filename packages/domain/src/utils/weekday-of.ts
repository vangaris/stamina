import { WEEKDAY_ORDER } from '../config.ts';
import type { Weekday } from '../enums/weekday.ts';

/** The weekday of a `YYYY-MM-DD` date, read in UTC. */
export function weekdayOf(date: string): Weekday {
  const utcDay = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 is Sunday
  return WEEKDAY_ORDER[(utcDay + WEEKDAY_ORDER.length - 1) % WEEKDAY_ORDER.length]!;
}
