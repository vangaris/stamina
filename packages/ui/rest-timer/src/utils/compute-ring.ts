import { RING_RADIUS } from '../config.ts';
import type { RingMetrics } from '../types.ts';

const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/**
 * How much of the ring to paint: all of it at the start, none when the rest is over. Clamped to
 * 0-1; a non-positive or non-finite total, or a non-finite remainder, paints nothing.
 */
export function computeRing(remainingSeconds: number, totalSeconds: number): RingMetrics {
  const usable =
    Number.isFinite(remainingSeconds) && Number.isFinite(totalSeconds) && totalSeconds > 0;
  const fraction = usable ? Math.min(1, Math.max(0, remainingSeconds / totalSeconds)) : 0;
  return {
    fraction,
    circumference: CIRCUMFERENCE,
    dashOffset: CIRCUMFERENCE * (1 - fraction),
  };
}
