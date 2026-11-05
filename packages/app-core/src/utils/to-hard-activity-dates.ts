import type { ProgramWeek, SavedProfile } from '@stamina/contracts';
import { addDays, DAYS_IN_WEEK, Intensity, weekdayOf } from '@stamina/domain';

/**
 * The days of the week with a hard Activity: the profile's play days when play is Hard, none when
 * play varies. Read from the profile each time, never stored (as the server does).
 */
export function toHardActivityDates(
  startsOn: ProgramWeek['block']['startsOn'],
  {
    playDays,
    playVaries,
    playIntensity,
  }: Pick<SavedProfile, 'playDays' | 'playVaries' | 'playIntensity'>,
): string[] {
  if (playVaries || playIntensity !== Intensity.Hard) return [];
  return Array.from({ length: DAYS_IN_WEEK }, (_, offset) => addDays(startsOn, offset)).filter(
    (date) => playDays.includes(weekdayOf(date)),
  );
}
