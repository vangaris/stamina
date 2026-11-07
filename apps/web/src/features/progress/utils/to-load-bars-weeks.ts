import type { Progress } from '@stamina/contracts';
import type { Locale } from '@stamina/i18n';
import type { LoadBarsWeek } from '@stamina/ui-load-bars';
import { formatShortDate } from './format-short-date.ts';

/** The weeks the Load bars draw, oldest first, labelled by the day each starts on. The last one, this week, is marked. */
export function toLoadBarsWeeks(weeks: Progress['weeks'], locale: Locale): LoadBarsWeek[] {
  return weeks.map(({ startsOn, done, planned }, index) => ({
    label: formatShortDate(startsOn, locale),
    done,
    planned,
    current: index === weeks.length - 1,
  }));
}
