import { DAYS_IN_WEEK } from '../config.ts';
import { addDays } from './add-days.ts';
import { daysBetween } from './days-between.ts';

/**
 * The first day of the 7-day week that holds `date`, where weeks start on `anchor` and every
 * seventh day before and after it (`anchor` may be any week's first day).
 */
export function weekStartOf(anchor: string, date: string): string {
  const weeksFromAnchor = Math.floor(daysBetween(anchor, date) / DAYS_IN_WEEK);
  return addDays(anchor, weeksFromAnchor * DAYS_IN_WEEK);
}
