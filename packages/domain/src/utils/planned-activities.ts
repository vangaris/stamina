import type { PlannedActivity, PlannedActivityInput } from '../types.ts';
import { weekDates } from './week-dates.ts';

/**
 * The Activities planned for the week starting `startsOn`: one on each play day, with the
 * person's usual duration and intensity. "It varies" means none are planned, so there are none.
 * Nothing is planned before `notBefore` (`YYYY-MM-DD`, when given): the plan starts the day the
 * person's Program does, so the days of that week before it are not planned days.
 */
export function plannedActivities(
  startsOn: string,
  { playDays, playVaries, playMinutes, playIntensity }: PlannedActivityInput,
  notBefore?: string,
): PlannedActivity[] {
  if (playVaries) return [];
  return weekDates(startsOn)
    .filter(({ weekday, date }) => playDays.includes(weekday) && (!notBefore || date >= notBefore))
    .map(({ date, weekday }) => ({
      date,
      weekday,
      minutes: playMinutes,
      intensity: playIntensity,
    }));
}
