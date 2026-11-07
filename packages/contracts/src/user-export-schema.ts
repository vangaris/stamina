import { ConsentPurpose, ScreeningQuestion } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { z } from 'zod';
import { programWeekSchema } from './program-schema.ts';
import { savedProfileSchema } from './saved-profile-schema.ts';
import { exportedActivitySchema } from './activity-schema.ts';
import { exportedAdaptationSchema } from './adaptation-schema.ts';
import { exportedCheckinSchema } from './checkin-schema.ts';
import { exportedStopFlagSchema } from './stop-flag-schema.ts';
import { savedScreeningSchema } from './saved-screening-schema.ts';
import { exportedFinishSchema, exportedSetSchema } from './session-schema.ts';
import { exportedWeighInSchema } from './weigh-in-schema.ts';
import { nutritionSetupSchema } from './nutrition-schema.ts';
import { exportedMealLogSchema } from './meal-log-schema.ts';
import { exportedWaterLogSchema } from './water-schema.ts';

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
  /** Every Check-in the person sent, oldest first. */
  checkins: z.array(exportedCheckinSchema),
  /** Every Adaptation suggested to the person, decided or not, oldest first. */
  adaptations: z.array(exportedAdaptationSchema),
  /** Every stop flag the person reported, oldest first. */
  stopFlags: z.array(exportedStopFlagSchema),
  /** Every weigh-in the person logged, oldest first. */
  weighIns: z.array(exportedWeighInSchema),
  /** The Unlock Meals setup (weight is the basis weight the targets use), or `null` before it. */
  nutritionSetup: nutritionSetupSchema.nullable(),
  /** Every water log the person made, oldest first. */
  waterLogs: z.array(exportedWaterLogSchema),
  /** Every meal log the person made (status and the dish they saw), oldest first. */
  mealLogs: z.array(exportedMealLogSchema),
  screenings: z.array(
    savedScreeningSchema.extend({
      answers: z.record(z.enum(ScreeningQuestion), z.boolean()),
    }),
  ),
});
