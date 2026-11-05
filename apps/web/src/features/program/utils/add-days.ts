import { MS_PER_DAY } from '../config.ts';

/** The UTC calendar day `days` after `date` (`YYYY-MM-DD`). */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);
}
