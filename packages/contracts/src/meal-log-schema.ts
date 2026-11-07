import { MAX_MEALS_PER_DAY, MealLogStatus } from '@stamina/domain';
import { z } from 'zod';
import { FOOD_ID_MAX_LENGTH } from './config.ts';

const isoDate = z.iso.date();
/** A slot's place in the day's list: 0 is the first meal. */
const slotIndex = z
  .number()
  .int()
  .min(0)
  .max(MAX_MEALS_PER_DAY - 1);

/**
 * An ingredient or template id: its shape only, never looked up in the bundled data, so the server
 * stays tolerant of ids a newer app made (`<pattern>-<slot>-<n>`).
 */
export const foodIdSchema = z.string().min(1).max(FOOD_ID_MAX_LENGTH);

/**
 * One tap on a meal slot: ate it, ate something else, or skipped. The id is made on the device,
 * so a replay is recognised and never stored twice; the day defaults to UTC today. `slotIndex`
 * is the slot's place in the day's list (0 is the first meal). `templateId` is the idea the
 * person saw, kept so the log says which dish "ate it" meant. Health data: never logged.
 */
export const logMealSchema = z.object({
  id: z.uuid(),
  /** The person's calendar day, `YYYY-MM-DD`. */
  date: isoDate.optional(),
  slotIndex,
  status: z.enum(MealLogStatus),
  templateId: foodIdSchema.optional(),
});

/** `POST /meal-logs` answers `200` with the stored row (the same row for a replay of an id). */
export const logMealResultSchema = z.object({
  id: z.uuid(),
  date: isoDate,
  slotIndex,
  status: z.enum(MealLogStatus),
});

/** A meal log in the data export. */
export const exportedMealLogSchema = logMealResultSchema.extend({
  templateId: z.string().nullable(),
  loggedAt: z.iso.datetime(),
});
