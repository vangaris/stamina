import {
  ActivityRejection,
  RecordStatus,
  SportKind,
  type LogActivity,
  type LogActivityResult,
} from '@stamina/contracts';
import {
  ActivitySource,
  MAX_ACTIVITY_FUTURE_DAYS,
  activityLoad,
  activityRpe,
  daysBetween,
  plannedActivities,
} from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { lockUser } from '../db/lock-user.ts';
import { activity, profile } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { refreshAdaptations } from '../adaptations/index.ts';
import { ActivityIdTakenError } from './activity-id-taken-error.ts';
import { readLoadAnchor } from './read-load-anchor.ts';
import { toLoggedActivity } from './to-logged-activity.ts';

/**
 * Records one Activity of the user, or rejects it when its day is more than
 * `MAX_ACTIVITY_FUTURE_DAYS` ahead of today (UTC, from `now`). There is no limit on how far back:
 * an Activity logged offline arrives whenever the device is next online, and refusing it would
 * delete it. The server sets the RPE and Load from the intensity and minutes, and marks
 * the Activity `planned` when its day is one of the profile's play days. Replays are safe: an id
 * the user already has returns the stored Activity with `recorded: false` and changes nothing
 * (checked before the date, so a late retry of a saved Activity still answers `Saved`). An id that
 * belongs to another person throws `ActivityIdTakenError`. Runs under `lockUser`. A new Activity
 * runs the Adaptation rules in the same transaction (`refreshAdaptations`), so a hard unplanned day
 * can raise a suggestion at once.
 */
export async function logActivity(
  db: Db,
  userId: string,
  entry: LogActivity,
  now: Date,
): Promise<LogActivityResult> {
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);

    const [replay] = await tx.select().from(activity).where(eq(activity.id, entry.id));
    if (replay !== undefined) {
      return {
        status: RecordStatus.Saved,
        recorded: false,
        activity: toLoggedActivity(replay),
      };
    }

    const today = now.toISOString().slice(0, 10);
    const offset = daysBetween(today, entry.date);
    if (offset > MAX_ACTIVITY_FUTURE_DAYS) {
      return { status: RecordStatus.Rejected, reason: ActivityRejection.DateOutOfRange };
    }

    const [own] = await tx.select().from(profile).where(eq(profile.userId, userId));
    const anchor = await readLoadAnchor(tx, userId, today);
    const planned =
      own !== undefined &&
      plannedActivities(entry.date, own, anchor).some((day) => day.date === entry.date);

    const rpe = activityRpe(entry.intensity);
    const [stored] = await tx
      .insert(activity)
      .values({
        id: entry.id,
        userId,
        sportKind: entry.sport.kind,
        launchSport: entry.sport.kind === SportKind.Launch ? entry.sport.sport : null,
        otherSportName: entry.sport.kind === SportKind.Other ? entry.sport.name : null,
        date: entry.date,
        minutes: entry.minutes,
        intensity: entry.intensity,
        rpe,
        load: activityLoad(entry.intensity, entry.minutes),
        planned,
        hot: entry.hot,
        source: ActivitySource.Manual,
      })
      .onConflictDoNothing()
      .returning();
    if (stored === undefined) throw new ActivityIdTakenError();
    await refreshAdaptations(tx, userId, now);
    return { status: RecordStatus.Saved, recorded: true, activity: toLoggedActivity(stored) };
  });
}
