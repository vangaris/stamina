import type { Locale } from '@stamina/i18n';
import { SHORT_DATE_FORMAT } from '../config.ts';

/** "12 Oct" in the person's language, for a UTC calendar day (`YYYY-MM-DD`). */
export function formatShortDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, SHORT_DATE_FORMAT).format(new Date(`${date}T00:00:00Z`));
}
