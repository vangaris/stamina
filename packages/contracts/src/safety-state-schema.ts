import { ConsentPurpose } from '@stamina/domain';
import { z } from 'zod';
import { savedScreeningSchema } from './saved-screening-schema.ts';

/** `GET /safety`: where the person stands before any Program. */
export const safetyStateSchema = z.object({
  /** Whether onboarding saved a profile; without one no health question is asked. */
  profileSaved: z.boolean(),
  granted: z.array(z.enum(ConsentPurpose)),
  /** The latest Screening, or `null` before the first. */
  screening: savedScreeningSchema.nullable(),
});
