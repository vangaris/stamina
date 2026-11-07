import type { Locale } from '@stamina/i18n';
import { MS_PER_MINUTE, TIME_FORMAT } from '../config.ts';

/** A minute of the day as a clock time: 1350 is "22:30". */
export function formatTime(minuteOfDay: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, TIME_FORMAT).format(new Date(minuteOfDay * MS_PER_MINUTE));
}
