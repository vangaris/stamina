import { MAX_FIXED_DIGITS } from '../config.ts';
import { clampToRange } from './clamp-to-range.ts';
import { countDecimals } from './count-decimals.ts';

interface NormalizeContext {
  /** The current value; its precision is kept. */
  current: number;
  step: number;
  min?: number | undefined;
  max?: number | undefined;
}

/**
 * Rounds `target` to the precision the inputs have (never the float noise of a sum such as
 * `0.1 + 0.2`) and clamps it to the bounds.
 */
export function normalizeValue(
  target: number,
  { current, step, min, max }: NormalizeContext,
): number {
  const places = Math.max(
    countDecimals(step),
    countDecimals(current),
    countDecimals(min),
    countDecimals(max),
  );
  return clampToRange(Number(target.toFixed(Math.min(places, MAX_FIXED_DIGITS))), min, max);
}
