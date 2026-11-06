import { SportKind, type PlannedActivity, type WeekLoad } from '@stamina/contracts';
import {
  DAYS_IN_WEEK,
  addDays,
  plannedActivities,
  summariseWeeklyLoad,
  type LoadEntry,
} from '@stamina/domain';
import { asc, eq } from 'drizzle-orm';
import { activity, profile, session, sessionLog } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { readLoadAnchor } from './read-load-anchor.ts';
import { toLoggedActivity } from './to-logged-activity.ts';

const sum = (entries: readonly LoadEntry[]) => entries.reduce((total, { load }) => total + load, 0);

/**
 * The week that holds today (UTC, from `now`): its Session and Activity Loads, the user's average
 * of the weeks before it, the Activities planned from their play days (none when the sport
 * varies or there is no profile) with the logged Activity that fills each, and the week's
 * Activities oldest first. Weeks are counted from `readLoadAnchor`.
 */
export async function readWeekLoad(tx: UserTx, userId: string, now: Date): Promise<WeekLoad> {
  const today = now.toISOString().slice(0, 10);
  const anchor = await readLoadAnchor(tx, userId, today);

  const sessionEntries: LoadEntry[] = await tx
    .select({ date: session.date, load: sessionLog.load })
    .from(sessionLog)
    .innerJoin(session, eq(session.id, sessionLog.sessionId))
    .where(eq(sessionLog.userId, userId));
  const activityRows = await tx
    .select()
    .from(activity)
    .where(eq(activity.userId, userId))
    .orderBy(asc(activity.date), asc(activity.loggedAt), asc(activity.id));

  const summary = summariseWeeklyLoad({
    anchor,
    today,
    entries: [...sessionEntries, ...activityRows],
  });
  const startsOn = summary.current.startsOn;
  const endsBefore = addDays(startsOn, DAYS_IN_WEEK);
  const inWeek = ({ date }: LoadEntry) => date >= startsOn && date < endsBefore;

  const sessionLoadOfWeek = sum(sessionEntries.filter(inWeek));
  const weekRows = activityRows.filter(inWeek);

  const [own] = await tx.select().from(profile).where(eq(profile.userId, userId));
  const planned: PlannedActivity[] =
    own === undefined
      ? []
      : plannedActivities(startsOn, own, anchor).map((day) => ({
          ...day,
          sport:
            own.sportKind === SportKind.Launch
              ? { kind: SportKind.Launch, sport: own.launchSport! }
              : { kind: SportKind.Other, name: own.otherSportName! },
          loggedActivityId:
            weekRows.find((row) => row.planned && row.date === day.date)?.id ?? null,
        }));

  return {
    startsOn,
    sessionLoad: sessionLoadOfWeek,
    activityLoad: sum(weekRows),
    load: summary.current.load,
    average: summary.average,
    previous: summary.previous,
    plannedActivities: planned,
    activities: weekRows.map(toLoggedActivity),
  };
}
