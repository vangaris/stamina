import type { RestClock } from '../types.ts';

/** The browser's time and `setInterval`; the rest timer's default clock. */
export function createBrowserClock(): RestClock {
  return {
    now: () => Date.now(),
    every: (callback, ms) => {
      const handle = setInterval(callback, ms);
      return () => clearInterval(handle);
    },
  };
}
