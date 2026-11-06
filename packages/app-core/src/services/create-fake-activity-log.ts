import {
  ActivityRejection,
  RecordStatus,
  type LoggedActivity,
  type LogActivity,
  type LogActivityResult,
  type SavedProfile,
  type WeekLoad,
} from '@stamina/contracts';
import {
  activityLoad,
  activityRpe,
  ActivitySource,
  daysBetween,
  MAX_ACTIVITY_FUTURE_DAYS,
  plannedActivities,
  summariseWeeklyLoad,
  weekStartOf,
  type LoadEntry,
} from '@stamina/domain';

type PlayProfile = Pick<
  SavedProfile,
  'sport' | 'playDays' | 'playVaries' | 'playMinutes' | 'playIntensity'
>;

/** What the fake API needs, per call, to apply the server's rules (the caller knows the user, the clock and the Program). */
export interface FakeActivityContext {
  userId: string;
  /** The week anchor: the first Block's start, else today. */
  anchor: string;
  /** Today, `YYYY-MM-DD` in UTC. */
  today: string;
  profile: PlayProfile | undefined;
}

/**
 * What the fake API remembers of Activities, with the server's rules: append-only and idempotent
 * by id (a replay returns the stored one with `recorded: false`); a date more than a day ahead
 * is `DateOutOfRange` (any date back is kept, as the server does); Load is the intensity's RPE times minutes; `planned` when the
 * day is one of the person's play days. The week is Session Loads plus Activity Loads against the
 * average of the weeks before it.
 */
export function createFakeActivityLog() {
  const activities = new Map<string, LoggedActivity[]>();
  const read = (userId: string) => activities.get(userId) ?? [];

  const isPlannedDay = ({ anchor, profile }: FakeActivityContext, date: string) =>
    profile !== undefined &&
    plannedActivities(weekStartOf(anchor, date), profile, anchor).some(
      (planned) => planned.date === date,
    );

  return {
    /** Everything logged by the user, oldest first (the data export). */
    all: read,
    /** Account deletion. */
    forget(userId: string): void {
      activities.delete(userId);
    },
    log(context: FakeActivityContext, activity: LogActivity): LogActivityResult {
      const { userId, today } = context;
      const existing = read(userId).find(({ id }) => id === activity.id);
      if (existing) return { status: RecordStatus.Saved, recorded: false, activity: existing };
      if (daysBetween(today, activity.date) > MAX_ACTIVITY_FUTURE_DAYS) {
        return { status: RecordStatus.Rejected, reason: ActivityRejection.DateOutOfRange };
      }
      const stored: LoggedActivity = {
        ...activity,
        rpe: activityRpe(activity.intensity),
        load: activityLoad(activity.intensity, activity.minutes),
        planned: isPlannedDay(context, activity.date),
        source: ActivitySource.Manual,
        loggedAt: new Date().toISOString(),
      };
      activities.set(userId, [...read(userId), stored]);
      return { status: RecordStatus.Saved, recorded: true, activity: stored };
    },
    /** `sessionEntries`: the user's finished Sessions, as Load on the Session's date. */
    week(context: FakeActivityContext, sessionEntries: readonly LoadEntry[]): WeekLoad {
      const { userId, anchor, today, profile } = context;
      const mine = read(userId);
      const summary = summariseWeeklyLoad({
        anchor,
        today,
        entries: [...sessionEntries, ...mine.map(({ date, load }): LoadEntry => ({ date, load }))],
      });
      const startsOn = summary.current.startsOn;
      const inWeek = (date: string) => weekStartOf(anchor, date) === startsOn;
      const sessionLoad = sessionEntries
        .filter(({ date }) => inWeek(date))
        .reduce((total, { load }) => total + load, 0);
      const weekActivities = mine.filter(({ date }) => inWeek(date));
      const activityTotal = weekActivities.reduce((total, { load }) => total + load, 0);
      const planned = profile
        ? plannedActivities(startsOn, profile, anchor).map((entry) => ({
            ...entry,
            sport: profile.sport,
            loggedActivityId:
              weekActivities.find(
                ({ planned: isPlanned, date }) => isPlanned && date === entry.date,
              )?.id ?? null,
          }))
        : [];
      return {
        startsOn,
        sessionLoad,
        activityLoad: activityTotal,
        load: sessionLoad + activityTotal,
        average: summary.average,
        previous: summary.previous,
        plannedActivities: planned,
        activities: weekActivities,
      };
    },
  };
}
