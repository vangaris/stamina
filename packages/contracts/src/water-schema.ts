import { WaterAmount } from '@stamina/domain';
import { z } from 'zod';

const isoDate = z.iso.date();

/**
 * One quick-log of water: 250 or 500 ml. The id is made on the device, so a replay is
 * recognised and never counted twice; the day defaults to UTC today.
 */
export const logWaterSchema = z.object({
  id: z.uuid(),
  ml: z.enum(WaterAmount),
  /** The person's calendar day, `YYYY-MM-DD`. */
  date: isoDate.optional(),
});

/** `POST /water` answers `200` with the stored row (the same row for a replay of an id). */
export const logWaterResultSchema = z.object({
  id: z.uuid(),
  date: isoDate,
  ml: z.enum(WaterAmount),
});

/** A water log in the data export. */
export const exportedWaterLogSchema = logWaterResultSchema.extend({
  loggedAt: z.iso.datetime(),
});
