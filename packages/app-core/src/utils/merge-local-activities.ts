import type { LoggedActivity, WeekLoad } from '@stamina/contracts';
import { activityLoad, activityRpe, ActivitySource, addDays, DAYS_IN_WEEK } from '@stamina/domain';
import type { LocalActivity } from '../types.ts';

/**
 * The server's week plus the Activities this device logged that the server does not show yet.
 * One counts only when its date is in the week (`startsOn` and the six days after) and the server
 * has no Activity with its id (the server's copy wins). Its Load is computed the way the server
 * does and it is `planned` when its date is a planned play day; a planned day still open is
 * filled by the first such Activity (by `loggedAt`). `activityLoad` and `load` grow by what was
 * added; `average` and `previous` never change. Neither input changes (with nothing to add, the week is returned as it is).
 */
export function mergeLocalActivities(week: WeekLoad, local: readonly LocalActivity[]): WeekLoad {
  const endsBefore = addDays(week.startsOn, DAYS_IN_WEEK);
  const plannedDates = new Set(week.plannedActivities.map(({ date }) => date));
  const known = new Set(week.activities.map(({ id }) => id));

  const added: LoggedActivity[] = [];
  for (const { activity, recordedAt } of local) {
    if (known.has(activity.id) || activity.date < week.startsOn || activity.date >= endsBefore) {
      continue;
    }
    known.add(activity.id);
    added.push({
      ...activity,
      rpe: activityRpe(activity.intensity),
      load: activityLoad(activity.intensity, activity.minutes),
      planned: plannedDates.has(activity.date),
      source: ActivitySource.Manual,
      loggedAt: recordedAt,
    });
  }
  if (added.length === 0) return week;

  const activities = [...week.activities, ...added].sort((a, b) =>
    a.loggedAt.localeCompare(b.loggedAt),
  );
  const addedLoad = added.reduce((total, { load }) => total + load, 0);
  const plannedActivities = week.plannedActivities.map((planned) => {
    if (planned.loggedActivityId !== null) return planned;
    const filler = activities.find(
      ({ planned: isPlanned, date }) => isPlanned && date === planned.date,
    );
    return filler ? { ...planned, loggedActivityId: filler.id } : planned;
  });
  return {
    ...week,
    activityLoad: week.activityLoad + addedLoad,
    load: week.load + addedLoad,
    plannedActivities,
    activities,
  };
}
