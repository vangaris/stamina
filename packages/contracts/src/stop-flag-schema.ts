import { BodyArea, StopFlag } from '@stamina/domain';
import { z } from 'zod';
import { RecordStatus } from './enums/record-status.ts';

/**
 * Reporting a stop flag, from the Check-in or a Session's Stop button (`sessionId` says which).
 * New pain names the body area, and only new pain does. The id is made on the device, so a replay
 * is recognised.
 */
export const reportStopFlagSchema = z
  .object({
    id: z.uuid(),
    flag: z.enum(StopFlag),
    /** The person's calendar day, `YYYY-MM-DD`. */
    date: z.iso.date(),
    bodyArea: z.enum(BodyArea).optional(),
    sessionId: z.uuid().optional(),
  })
  .refine(({ flag, bodyArea }) => (flag === StopFlag.NewPain) === (bodyArea !== undefined), {
    path: ['bodyArea'],
  });

/** What the reported flags add up to (`resolveStopState`). */
export const stopStateSchema = z.object({
  /** The distinct flags that still pause training, in the order reported. */
  pausing: z.array(z.enum(StopFlag)),
  /** The day of the latest fever: no training that day. */
  restOn: z.iso.date().nullable(),
  /** The areas of every reported new pain. */
  excludedAreas: z.array(z.enum(BodyArea)),
});

/** `POST /safety/stop-flags` answers `200` with the state after the report (`recorded` false for a replay). */
export const reportStopFlagResultSchema = z.object({
  status: z.literal(RecordStatus.Saved),
  recorded: z.boolean(),
  stop: stopStateSchema,
});

/** `POST /safety/stop-flags/confirm` answers `200` with the state after every open pause ended. */
export const confirmDoctorSeenResultSchema = z.object({
  status: z.literal(RecordStatus.Saved),
  stop: stopStateSchema,
});

/** A stop flag in the data export. */
export const exportedStopFlagSchema = z.object({
  id: z.uuid(),
  flag: z.enum(StopFlag),
  date: z.iso.date(),
  area: z.enum(BodyArea).nullable(),
  sessionId: z.uuid().nullable(),
  reportedAt: z.iso.datetime(),
  confirmedAt: z.iso.datetime().nullable(),
});
