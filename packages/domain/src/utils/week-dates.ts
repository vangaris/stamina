import { DAYS_IN_WEEK } from '../config.ts';
import type { WeekDate } from '../types.ts';
import { addDays } from './add-days.ts';
import { weekdayOf } from './weekday-of.ts';

/** The seven days starting on `startsOn`, each with its weekday. */
export function weekDates(startsOn: string): WeekDate[] {
  return Array.from({ length: DAYS_IN_WEEK }, (_, offset) => {
    const date = addDays(startsOn, offset);
    return { date, weekday: weekdayOf(date) };
  });
}
