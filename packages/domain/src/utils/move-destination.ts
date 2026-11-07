import { DAYS_IN_WEEK, HOURS_PER_DAY, MOVE_SESSION_OFFSETS } from '../config.ts';
import { Intensity } from '../enums/intensity.ts';
import type { ActivityFact, AdaptationContext, AdaptationSession } from '../types.ts';
import { addDays } from './add-days.ts';
import { daysBetween } from './days-between.ts';
import { hardActivityDates } from './hard-activity-dates.ts';
import { recoveryWindowHours } from './recovery-window-hours.ts';
import { weekdayOf } from './weekday-of.ts';

/**
 * The first day the Session can move to for an unplanned hard Activity, trying
 * `MOVE_SESSION_OFFSETS` in order, or `null` when none fits. The day is inside the current week,
 * today or later, a day the person can train with no Session of the week on it, not a day with a
 * hard Activity (planned or logged), and clear of the recovery window after the logged Activity
 * and before the next planned hard Activity.
 */
export function moveDestination(
  context: AdaptationContext,
  session: AdaptationSession,
  activity: ActivityFact,
): string | null {
  const { generation, weekStartsOn, today, sessions, activities } = context;
  const window = recoveryWindowHours(generation.sport, session.focus);
  const weekEndsOn = addDays(weekStartsOn, DAYS_IN_WEEK - 1);
  const plannedHard = [
    ...hardActivityDates(weekStartsOn, generation),
    ...hardActivityDates(addDays(weekStartsOn, DAYS_IN_WEEK), generation),
  ];
  const loggedHard = activities
    .filter(({ intensity }) => intensity === Intensity.Hard)
    .map(({ date }) => date);

  for (const offset of MOVE_SESSION_OFFSETS) {
    const to = addDays(session.date, offset);
    if (to < weekStartsOn || to > weekEndsOn || to < today) continue;
    if (!generation.trainingWeek.availableDays.includes(weekdayOf(to))) continue;
    if (sessions.some((other) => other.date === to)) continue;
    if (plannedHard.includes(to) || loggedHard.includes(to)) continue;
    if (daysBetween(activity.date, to) * HOURS_PER_DAY <= window) continue;
    const nextHard = plannedHard.filter((date) => date > to).sort()[0];
    if (nextHard !== undefined && daysBetween(to, nextHard) * HOURS_PER_DAY <= window) continue;
    return to;
  }
  return null;
}
