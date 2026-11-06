import { ActivitySource, Intensity, LaunchSport, Weekday, activityLoad } from '@stamina/domain';
import {
  SportKind,
  type LoggedActivity,
  type PlannedActivity,
  type WeekLoad,
} from '@stamina/contracts';

export const PADEL = { kind: SportKind.Launch, sport: LaunchSport.Padel } as const;

export function makeLoggedActivity(overrides: Partial<LoggedActivity> = {}): LoggedActivity {
  const intensity = overrides.intensity ?? Intensity.Moderate;
  const minutes = overrides.minutes ?? 90;
  return {
    id: '20000000-0000-4000-8000-000000000001',
    sport: PADEL,
    date: '2026-11-10',
    minutes,
    intensity,
    hot: false,
    rpe: 6,
    load: activityLoad(intensity, minutes),
    planned: false,
    source: ActivitySource.Manual,
    loggedAt: '2026-11-10T18:00:00.000Z',
    ...overrides,
  };
}

export function makePlannedActivity(overrides: Partial<PlannedActivity> = {}): PlannedActivity {
  return {
    date: '2026-11-10',
    weekday: Weekday.Tue,
    sport: PADEL,
    minutes: 90,
    intensity: Intensity.Moderate,
    loggedActivityId: null,
    ...overrides,
  };
}

export function makeWeekLoad(overrides: Partial<WeekLoad> = {}): WeekLoad {
  return {
    startsOn: '2026-11-06',
    sessionLoad: 0,
    activityLoad: 0,
    load: 0,
    average: null,
    previous: [],
    plannedActivities: [],
    activities: [],
    ...overrides,
  };
}
