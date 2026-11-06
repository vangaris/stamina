import { MS_PER_DAY } from '../config.ts';

/** Whole days from `from` to `to` (negative when `to` is earlier); both are `YYYY-MM-DD` in UTC. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}
