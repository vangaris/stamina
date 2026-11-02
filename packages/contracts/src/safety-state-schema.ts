import { ConsentPurpose } from '@stamina/domain';
import { z } from 'zod';
import { savedScreeningSchema } from './saved-screening-schema.ts';

/** `GET /safety`: where the person stands before any Program. */
export const safetyStateSchema = z.object({
  granted: z.array(z.enum(ConsentPurpose)),
  /** The latest Screening, or `null` before the first. */
  screening: savedScreeningSchema.nullable(),
});
