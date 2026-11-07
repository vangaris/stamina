import { MINUTES_IN_HOUR } from '@stamina/domain';

/** The minute of the day on the person's clock: 8:30 is 510. */
export function minuteOfDay(date: Date): number {
  return date.getHours() * MINUTES_IN_HOUR + date.getMinutes();
}
