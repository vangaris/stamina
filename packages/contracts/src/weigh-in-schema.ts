import { MAX_BODY_WEIGHT_KG, MIN_BODY_WEIGHT_KG } from '@stamina/domain';
import { z } from 'zod';

const isoDate = z.iso.date();

/**
 * The optional weekly weigh-in: a weight in kilograms (whatever units the person reads on the
 * screen, the wire is kg) and, when it is not today, the day it was taken (`YYYY-MM-DD`, UTC
 * today by default).
 */
export const logWeighInSchema = z.object({
  weightKg: z.number().min(MIN_BODY_WEIGHT_KG).max(MAX_BODY_WEIGHT_KG),
  date: isoDate.optional(),
});

/** `POST /weigh-ins` answers `200` with what was stored. */
export const logWeighInResultSchema = z.object({
  date: isoDate,
  weightKg: z.number(),
});

/** A weigh-in in the data export. */
export const exportedWeighInSchema = logWeighInResultSchema.extend({
  id: z.uuid(),
  loggedAt: z.iso.datetime(),
});
