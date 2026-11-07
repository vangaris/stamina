import { ConsentPurpose } from '@stamina/domain';
import { z } from 'zod';
import { savedScreeningSchema } from './saved-screening-schema.ts';
import { stopStateSchema } from './stop-flag-schema.ts';

/** `GET /safety`: where the person stands before any Program. */
export const safetyStateSchema = z.object({
  /** Whether onboarding saved a profile; without one no health question is asked. */
  profileSaved: z.boolean(),
  granted: z.array(z.enum(ConsentPurpose)),
  /** The latest Screening, or `null` before the first. */
  screening: savedScreeningSchema.nullable(),
  /** What the reported stop flags add up to: pauses, the rest day and the excluded areas. */
  stop: stopStateSchema,
});
