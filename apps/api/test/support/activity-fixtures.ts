import {
  HttpMethod,
  SportKind,
  activityPath,
  ActivitySubpath,
  logActivityResultSchema,
  weekLoadSchema,
  type LogActivity,
  type WeekLoad,
} from '@stamina/contracts';
import { ActivitySource, Intensity, LaunchSport, activityLoad, activityRpe } from '@stamina/domain';
import { activity } from '../../src/db/schema.ts';
import type { FixtureUser, TestApi } from './safety-fixtures.ts';

/** An Activity as the device would send it: a fresh id, padel, 60 minutes, moderate, not hot. */
export const activityOf = (date: string, overrides: Partial<LogActivity> = {}): LogActivity => ({
  id: crypto.randomUUID(),
  sport: { kind: SportKind.Launch, sport: LaunchSport.Padel },
  date,
  minutes: 60,
  intensity: Intensity.Moderate,
  hot: false,
  ...overrides,
});

/** Calls `POST /activities`. */
export async function postActivity(user: FixtureUser, entry: LogActivity) {
  const response = await user.call(HttpMethod.Post, activityPath(), entry);
  return { status: response.status, result: logActivityResultSchema.parse(await response.json()) };
}

/** Calls `GET /activities/week`. */
export async function getWeek(user: FixtureUser): Promise<WeekLoad> {
  const response = await user.call(HttpMethod.Get, activityPath(ActivitySubpath.Week));
  if (response.status !== 200) throw new Error(`get week failed: ${response.status}`);
  return weekLoadSchema.parse(await response.json());
}

/**
 * Inserts, as the table owner, an Activity on any date (the API takes none older than a week), for
 * the weeks the average looks back over. Returns its Load.
 */
export async function insertActivity(
  api: TestApi,
  user: FixtureUser,
  date: string,
  minutes: number,
  intensity: Intensity = Intensity.Moderate,
): Promise<number> {
  await api.db.insert(activity).values({
    id: crypto.randomUUID(),
    userId: user.userId,
    sportKind: SportKind.Launch,
    launchSport: LaunchSport.Padel,
    otherSportName: null,
    date,
    minutes,
    intensity,
    rpe: activityRpe(intensity),
    load: activityLoad(intensity, minutes),
    planned: false,
    hot: false,
    source: ActivitySource.Manual,
  });
  return activityLoad(intensity, minutes);
}
