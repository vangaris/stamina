import type { LoggedActivity, WeekLoad } from '@stamina/contracts';
import { ActivityStatus } from '../enums/activity-status.ts';
import type { ActivitiesByDate, ActivityRowView } from '../types.ts';

function played(activity: LoggedActivity): ActivityRowView {
  return {
    key: activity.id,
    status: ActivityStatus.Done,
    sport: activity.sport,
    minutes: activity.minutes,
    intensity: activity.intensity,
    load: activity.load,
  };
}

/**
 * The week's Activities by date. A planned Activity comes first: still to do, or replaced by the
 * Activity played on that play day. Any other Activity played that day follows, oldest first.
 * When the sport varies there are no planned Activities, so only what was played shows.
 */
export function groupActivitiesByDate({
  plannedActivities,
  activities,
}: WeekLoad): ActivitiesByDate {
  const byDate: Record<string, ActivityRowView[]> = {};
  const add = (date: string, row: ActivityRowView) => (byDate[date] ??= []).push(row);
  const filled = new Set<string>();

  for (const planned of plannedActivities) {
    const fill = activities.find(({ id }) => id === planned.loggedActivityId);
    if (fill) {
      filled.add(fill.id);
      add(planned.date, played(fill));
    } else {
      add(planned.date, {
        key: `planned-${planned.date}`,
        status: ActivityStatus.Planned,
        sport: planned.sport,
        minutes: planned.minutes,
        intensity: planned.intensity,
        load: undefined,
      });
    }
  }
  for (const activity of activities) {
    if (!filled.has(activity.id)) add(activity.date, played(activity));
  }
  return byDate;
}
