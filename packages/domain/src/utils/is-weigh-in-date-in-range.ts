import { MAX_ACTIVITY_FUTURE_DAYS, MAX_WEIGH_IN_PAST_DAYS } from '../config.ts';
import { daysBetween } from './days-between.ts';

/**
 * Whether a weigh-in may be dated `date` when today (UTC) is `today`: at most
 * `MAX_ACTIVITY_FUTURE_DAYS` ahead (a device clock or time zone ahead) and at most
 * `MAX_WEIGH_IN_PAST_DAYS` back, which also keeps years the database cannot store out.
 * Both are `YYYY-MM-DD`.
 */
export function isWeighInDateInRange(today: string, date: string): boolean {
  const offset = daysBetween(today, date);
  return offset <= MAX_ACTIVITY_FUTURE_DAYS && offset >= -MAX_WEIGH_IN_PAST_DAYS;
}
