import type { WeeklyWeight } from '../types.ts';
import { weekStartOf } from './week-start-of.ts';

/**
 * One weigh-in per program-anchored week: the last of the week, kept with its own date.
 * `weighIns` is ordered oldest first; the result is oldest week first.
 */
export function toWeeklyWeights(
  anchor: string,
  weighIns: readonly { date: string; weightKg: number }[],
): WeeklyWeight[] {
  const byWeek = new Map<string, WeeklyWeight>();
  for (const { date, weightKg } of weighIns) {
    byWeek.set(weekStartOf(anchor, date), { date, weightKg });
  }
  return [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, weight]) => weight);
}
