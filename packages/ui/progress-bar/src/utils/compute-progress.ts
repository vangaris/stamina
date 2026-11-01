import { PROGRESS_BAR_FALLBACK_RANGE } from '../config.ts';
import type { ProgressMetrics } from '../types.ts';

/**
 * Out-of-range values are clamped. A non-finite `value` counts as `min`; an unusable range
 * (non-finite `min`/`max`, or `max <= min`) falls back to 0-100.
 */
export function computeProgress(value: number, rawMin: number, rawMax: number): ProgressMetrics {
  const min = Number.isFinite(rawMin) ? rawMin : PROGRESS_BAR_FALLBACK_RANGE.min;
  const range =
    Number.isFinite(rawMax) && rawMax > min ? { min, max: rawMax } : PROGRESS_BAR_FALLBACK_RANGE;
  const now = Number.isFinite(value) ? Math.min(range.max, Math.max(range.min, value)) : range.min;
  return {
    min: range.min,
    max: range.max,
    now,
    percent: ((now - range.min) / (range.max - range.min)) * 100,
  };
}
