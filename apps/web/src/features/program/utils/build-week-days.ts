import type { ProgramWeek } from '@stamina/contracts';
import { WEEK_LENGTH_DAYS } from '../config.ts';
import type { WeekDay } from '../types.ts';
import { addDays } from './add-days.ts';

/** The week as seven dates from `startsOn`, each with its Session or none. */
export function buildWeekDays({ block, sessions }: ProgramWeek): WeekDay[] {
  return Array.from({ length: WEEK_LENGTH_DAYS }, (_, offset) => {
    const date = addDays(block.startsOn, offset);
    return { date, session: sessions.find((session) => session.date === date) };
  });
}
