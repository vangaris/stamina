import type { IntervalTimer } from '../types.ts';

/** The platform's `setInterval`. */
export function createSystemTimer(): IntervalTimer {
  return {
    every: (callback, ms) => {
      const handle = setInterval(callback, ms);
      return () => clearInterval(handle);
    },
  };
}
