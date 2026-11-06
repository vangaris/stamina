import {
  ActivitySource,
  Intensity,
  MAX_PLAY_MINUTES,
  MIN_PLAY_MINUTES,
  Weekday,
} from '@stamina/domain';
import { z } from 'zod';
import { ActivityRejection } from './enums/activity-rejection.ts';
import { RecordStatus } from './enums/record-status.ts';
import { sportSchema } from './profile-answers-schema.ts';

const isoDate = z.iso.date();

/**
 * "I played": the person gives the sport, the day, how long and how hard. The id is made on the
 * device, so a replay is recognised. The server turns the intensity into an RPE and the Load.
 */
export const logActivitySchema = z.object({
  id: z.uuid(),
  sport: sportSchema,
  /** The day played, `YYYY-MM-DD` on the person's calendar. */
  date: isoDate,
  minutes: z.number().int().min(MIN_PLAY_MINUTES).max(MAX_PLAY_MINUTES),
  intensity: z.enum(Intensity),
  /** Hot conditions; read by the hydration targets. */
  hot: z.boolean(),
});

/** An Activity as the server holds it. */
export const loggedActivitySchema = logActivitySchema.extend({
  /** What the intensity counted as. */
  rpe: z.number().int().min(1),
  /** RPE times minutes. */
  load: z.number().int().min(1),
  /** The day was one of the person's play days. */
  planned: z.boolean(),
  source: z.enum(ActivitySource),
  loggedAt: z.iso.datetime(),
});

/**
 * `POST /activities` answers `200` with `Saved` (the stored Activity; `recorded` false for a
 * replay of an id the server has) or `422` with `Rejected`.
 */
export const logActivityResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal(RecordStatus.Saved),
    recorded: z.boolean(),
    activity: loggedActivitySchema,
  }),
  z.object({ status: z.literal(RecordStatus.Rejected), reason: z.enum(ActivityRejection) }),
]);

/** An Activity planned from the person's play days, with the logged one that fills it, if any. */
export const plannedActivitySchema = z.object({
  date: isoDate,
  weekday: z.enum(Weekday),
  sport: sportSchema,
  minutes: z.number().int().min(1),
  intensity: z.enum(Intensity),
  /** The Activity logged on this play day; null while it is still to do. */
  loggedActivityId: z.uuid().nullable(),
});

/** The Load of one week. */
export const weeklyLoadSchema = z.object({
  startsOn: isoDate,
  load: z.number().int().min(0),
});

/**
 * `GET /activities/week`: the week that holds today, with its Load (Session Loads plus Activity
 * Loads) and the person's own average of the weeks before it. `average` is null until an earlier
 * week has data. `previous` lists the weeks the average covers, oldest first.
 */
export const weekLoadSchema = z.object({
  startsOn: isoDate,
  sessionLoad: z.number().int().min(0),
  activityLoad: z.number().int().min(0),
  load: z.number().int().min(0),
  average: z.number().int().min(0).nullable(),
  previous: z.array(weeklyLoadSchema),
  /** Empty when the person's sport varies. */
  plannedActivities: z.array(plannedActivitySchema),
  /** Every Activity logged in the week, oldest first. */
  activities: z.array(loggedActivitySchema),
});

/** An Activity in the data export. */
export const exportedActivitySchema = loggedActivitySchema;
