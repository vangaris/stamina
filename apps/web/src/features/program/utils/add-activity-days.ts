import type { WeekDay } from '../types.ts';

/**
 * The shown days plus a day for each date that has an Activity but is not among them (an
 * Activity played the day before the week starts, say), so nothing logged is hidden. Dates sort
 * as `YYYY-MM-DD` strings; the extra days have no Session and no planned hard Activity.
 */
export function addActivityDays(days: WeekDay[], activityDates: Iterable<string>): WeekDay[] {
  const shown = new Set(days.map(({ date }) => date));
  const extra = [...new Set(activityDates)]
    .filter((date) => !shown.has(date))
    .map((date): WeekDay => ({ date, session: undefined, hardActivity: false }));
  return [...days, ...extra].sort((a, b) => a.date.localeCompare(b.date));
}
