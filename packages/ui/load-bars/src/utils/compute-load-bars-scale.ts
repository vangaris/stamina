import { LOAD_BARS_MIN_SCALE_MAX } from '../config.ts';
import type { LoadBarsScale, LoadBarsWeek } from '../types.ts';

const clean = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Scales every bar and the average line to the largest of any week's `done + planned` and the
 * average. Negative or non-finite values count as 0; a non-finite average counts as absent.
 */
export function computeLoadBarsScale(
  weeks: readonly Pick<LoadBarsWeek, 'done' | 'planned'>[],
  average: number | null,
): LoadBarsScale {
  const avg = average !== null && Number.isFinite(average) ? clean(average) : null;
  const totals = weeks.map((w) => clean(w.done) + clean(w.planned));
  const max = Math.max(LOAD_BARS_MIN_SCALE_MAX, avg ?? 0, ...totals);
  const pct = (n: number) => (clean(n) / max) * 100;
  return {
    max,
    bars: weeks.map((w) => ({ donePercent: pct(w.done), plannedPercent: pct(w.planned) })),
    averagePercent: avg === null ? null : pct(avg),
  };
}
