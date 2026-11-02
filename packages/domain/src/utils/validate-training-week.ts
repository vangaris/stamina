import {
  MAX_SESSIONS_PER_WEEK,
  MIN_SESSIONS_PER_WEEK,
  SESSION_LENGTHS_MINUTES,
} from '../config.ts';
import { TrainingWeekProblem } from '../enums/training-week-problem.ts';
import type { TrainingWeek } from '../types.ts';

/** Everything wrong with a training week; empty when it is usable. */
export function validateTrainingWeek({
  sessionsPerWeek,
  sessionMinutes,
  availableDays,
}: TrainingWeek): TrainingWeekProblem[] {
  const problems: TrainingWeekProblem[] = [];
  const sessionsInRange =
    Number.isInteger(sessionsPerWeek) &&
    sessionsPerWeek >= MIN_SESSIONS_PER_WEEK &&
    sessionsPerWeek <= MAX_SESSIONS_PER_WEEK;
  if (!sessionsInRange) problems.push(TrainingWeekProblem.SessionsOutOfRange);
  if (!(SESSION_LENGTHS_MINUTES as readonly number[]).includes(sessionMinutes)) {
    problems.push(TrainingWeekProblem.LengthNotOffered);
  }
  if (new Set(availableDays).size < sessionsPerWeek) {
    problems.push(TrainingWeekProblem.TooFewAvailableDays);
  }
  return problems;
}
