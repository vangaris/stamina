import type { Locale } from '@stamina/i18n';
import { DATE_FORMAT } from '../config.ts';

/** "Friday, 6 November" in the person's language, for a UTC calendar day (`YYYY-MM-DD`). */
export function formatDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, DATE_FORMAT).format(new Date(`${date}T00:00:00Z`));
}
