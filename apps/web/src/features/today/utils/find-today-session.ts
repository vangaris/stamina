import type { ProgramWeek } from '@stamina/contracts';

/** The Session dated `date` (`YYYY-MM-DD`), if the week has one. */
export function findTodaySession(program: ProgramWeek | null, date: string) {
  return program?.sessions.find((session) => session.date === date);
}
