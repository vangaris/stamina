import { ANNOUNCE_EVERY_SECONDS, ANNOUNCE_LAST_SECONDS } from '../config.ts';

/**
 * Whether a change from `previous` to `current` seconds left is worth saying aloud: every 10 s,
 * every second of the last 5 (and at 0), and whenever time was added. Never for an unchanged or
 * non-finite value, so a screen reader is not read the clock every second.
 */
export function shouldAnnounce(current: number, previous?: number): boolean {
  if (!Number.isFinite(current) || current < 0) return false;
  if (previous !== undefined && current === previous) return false;
  if (previous !== undefined && Number.isFinite(previous) && current > previous) return true;
  return current <= ANNOUNCE_LAST_SECONDS || current % ANNOUNCE_EVERY_SECONDS === 0;
}
