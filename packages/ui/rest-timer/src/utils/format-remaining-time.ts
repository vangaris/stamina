import { SECONDS_PER_MINUTE } from '../config.ts';

/**
 * Formats seconds as m:ss ("0:00", "0:59", "1:00", "2:05"). Fractions round up (a countdown
 * reads 0:00 only when it is over); negative and non-finite values read 0:00.
 */
export function formatRemainingTime(seconds: number): string {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.ceil(seconds)) : 0;
  const minutes = Math.floor(whole / SECONDS_PER_MINUTE);
  const rest = whole % SECONDS_PER_MINUTE;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
