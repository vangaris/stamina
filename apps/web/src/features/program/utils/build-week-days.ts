import type { ProgramWeek } from '@stamina/contracts';
import { addDays, DAYS_IN_WEEK } from '@stamina/domain';
import type { WeekDay } from '../types.ts';

/** The week as seven dates from `startsOn`, each with its Session (or none) and whether a hard Activity is planned. */
export function buildWeekDays({ block, sessions, hardActivityDates }: ProgramWeek): WeekDay[] {
  return Array.from({ length: DAYS_IN_WEEK }, (_, offset) => {
    const date = addDays(block.startsOn, offset);
    return {
      date,
      session: sessions.find((session) => session.date === date),
      hardActivity: hardActivityDates.includes(date),
    };
  });
}
