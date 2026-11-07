import { MINUTES_IN_HOUR } from '@stamina/domain';
import { CLOCK_DIGITS, CLOCK_PAD } from '../config.ts';

/** A minute of the day as a 24-hour clock time: 480 is "08:00". */
export function formatTime(minute: number): string {
  const hours = Math.floor(minute / MINUTES_IN_HOUR);
  const minutes = minute % MINUTES_IN_HOUR;
  return `${String(hours).padStart(CLOCK_DIGITS, CLOCK_PAD)}:${String(minutes).padStart(CLOCK_DIGITS, CLOCK_PAD)}`;
}
