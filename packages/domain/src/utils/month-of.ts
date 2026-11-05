import { MONTH_END, MONTH_START } from '../config.ts';

/** The month, 1 to 12, of a `YYYY-MM-DD` date. */
export function monthOf(date: string): number {
  return Number(date.slice(MONTH_START, MONTH_END));
}
