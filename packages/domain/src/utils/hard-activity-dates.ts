import type { PlayPattern } from '../types.ts';
import { hardDays } from './hard-days.ts';
import { weekDates } from './week-dates.ts';

/** The dates of the week starting `startsOn` (`YYYY-MM-DD`, UTC) that carry a known hard Activity. */
export function hardActivityDates(startsOn: string, play: PlayPattern): string[] {
  const hard = hardDays(play);
  return weekDates(startsOn)
    .filter(({ weekday }) => hard.includes(weekday))
    .map(({ date }) => date);
}
