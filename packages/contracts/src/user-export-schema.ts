import { ConsentPurpose, ScreeningQuestion } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { z } from 'zod';
import { programWeekSchema } from './program-schema.ts';
import { savedProfileSchema } from './saved-profile-schema.ts';
import { exportedActivitySchema } from './activity-schema.ts';
import { savedScreeningSchema } from './saved-screening-schema.ts';
import { exportedFinishSchema, exportedSetSchema } from './session-schema.ts';

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
  /** The sports the person asked for under "Other", with the name of each. */
  sportRequests: z.array(
    z.object({
      sportId: z.string(),
      name: z.string(),
      requestedAt: z.iso.datetime(),
    }),
  ),
  /** The generated Program week, or `null` before the person has one. */
  program: programWeekSchema.nullable(),
  /** Every set the person logged, oldest first. */
  setLogs: z.array(exportedSetSchema),
  /** Every Session the person finished, oldest first. */
  sessionLogs: z.array(exportedFinishSchema),
  /** Every Activity the person logged, oldest first. */
  activities: z.array(exportedActivitySchema),
  screenings: z.array(
    savedScreeningSchema.extend({
      answers: z.record(z.enum(ScreeningQuestion), z.boolean()),
    }),
  ),
});
