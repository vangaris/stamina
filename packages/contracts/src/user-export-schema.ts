import { ConsentPurpose, ScreeningQuestion } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { z } from 'zod';
import { savedProfileSchema } from './saved-profile-schema.ts';
import { savedScreeningSchema } from './saved-screening-schema.ts';

/**
 * Everything Stamina holds about the signed-in user, as JSON. Screening answers are decrypted
 * here and nowhere else.
 */
export const userExportSchema = z.object({
  exportedAt: z.iso.datetime(),
  profile: savedProfileSchema.nullable(),
  consents: z.array(
    z.object({
      purpose: z.enum(ConsentPurpose),
      textVersion: z.string(),
      locale: z.enum(Locale),
      grantedAt: z.iso.datetime(),
      withdrawnAt: z.iso.datetime().nullable(),
    }),
  ),
  screenings: z.array(
    savedScreeningSchema.extend({
      answers: z.record(z.enum(ScreeningQuestion), z.boolean()),
    }),
  ),
});
