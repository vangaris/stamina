import { DAYS_IN_WEEK, LOAD_AVERAGE_WEEKS } from '../config.ts';
import type { LoadEntry, LoadSummary, WeeklyLoad } from '../types.ts';
import { addDays } from './add-days.ts';
import { weekStartOf } from './week-start-of.ts';

const sumLoad = (entries: readonly LoadEntry[], startsOn: string) => {
  const endsBefore = addDays(startsOn, DAYS_IN_WEEK);
  return entries
    .filter(({ date }) => date >= startsOn && date < endsBefore)
    .reduce((total, { load }) => total + load, 0);
};

/**
 * This week's Load (Sessions plus Activities) and the person's own average of the weeks before it.
 * Weeks run from `anchor` in sevens. The average covers the (up to) `LOAD_AVERAGE_WEEKS` weeks
 * before this one, from the week holding the first entry on: a week with no Load after that is a
 * real rest week and counts as 0, but weeks before the person had any data do not count, so a new
 * user is not compared against zeros. `average` is `null` until there is one such week, and is
 * rounded to a whole Load. Entries in later weeks are ignored.
 */
export function summariseWeeklyLoad({
  anchor,
  today,
  entries,
}: {
  anchor: string;
  today: string;
  entries: readonly LoadEntry[];
}): LoadSummary {
  const currentStart = weekStartOf(anchor, today);
  const firstEntry = entries.reduce<string | null>(
    (first, { date }) => (first === null || date < first ? date : first),
    null,
  );
  const firstWeek = firstEntry === null ? null : weekStartOf(anchor, firstEntry);

  const previous: WeeklyLoad[] = [];
  for (let weeksAgo = LOAD_AVERAGE_WEEKS; weeksAgo >= 1; weeksAgo--) {
    const startsOn = addDays(currentStart, -weeksAgo * DAYS_IN_WEEK);
    if (firstWeek === null || startsOn < firstWeek) continue;
    previous.push({ startsOn, load: sumLoad(entries, startsOn) });
  }

  const average =
    previous.length === 0
      ? null
      : Math.round(previous.reduce((total, { load }) => total + load, 0) / previous.length);

  return {
    current: { startsOn: currentStart, load: sumLoad(entries, currentStart) },
    previous,
    average,
  };
}
