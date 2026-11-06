import type { PlannedActivity, PlannedActivityInput } from '../types.ts';
import { weekDates } from './week-dates.ts';

/**
 * The Activities planned for the week starting `startsOn`: one on each play day, with the
 * person's usual duration and intensity. "It varies" means none are planned, so there are none.
 */
export function plannedActivities(
  startsOn: string,
  { playDays, playVaries, playMinutes, playIntensity }: PlannedActivityInput,
): PlannedActivity[] {
  if (playVaries) return [];
  return weekDates(startsOn)
    .filter(({ weekday }) => playDays.includes(weekday))
    .map(({ date, weekday }) => ({
      date,
      weekday,
      minutes: playMinutes,
      intensity: playIntensity,
    }));
}
