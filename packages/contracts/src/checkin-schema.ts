import { MAX_CHECKIN_SCORE, MIN_CHECKIN_SCORE } from '@stamina/domain';
import { z } from 'zod';
import { RecordStatus } from './enums/record-status.ts';

const score = z.number().int().min(MIN_CHECKIN_SCORE).max(MAX_CHECKIN_SCORE);

/** The daily Check-in: sleep, soreness and energy, each 1 (worst) to 5. The id is made on the device, so a replay is recognised. */
export const submitCheckinSchema = z.object({
  id: z.uuid(),
  /** The person's calendar day, `YYYY-MM-DD`. */
  date: z.iso.date(),
  sleep: score,
  soreness: score,
  energy: score,
});

/** A Check-in as the server holds it. */
export const checkinSchema = submitCheckinSchema.extend({ submittedAt: z.iso.datetime() });

/** `POST /checkins` answers `200` with the stored Check-in (`recorded` false for a replay of an id the server has). */
export const submitCheckinResultSchema = z.object({
  status: z.literal(RecordStatus.Saved),
  recorded: z.boolean(),
  checkin: checkinSchema,
});

/** `GET /checkins/latest`: the latest Check-in (by day, then by when it was sent), or null before the first. */
export const latestCheckinResponseSchema = z.object({ checkin: checkinSchema.nullable() });

/** A Check-in in the data export. */
export const exportedCheckinSchema = checkinSchema;
