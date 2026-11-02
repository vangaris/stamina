import {
  BodyArea,
  ReferralKind,
  ScreeningStatus,
  StartingLevel,
  TrainingMode,
} from '@stamina/domain';
import { z } from 'zod';

/**
 * A stored Screening as the app sees it: the outcome and what follows from it, never the
 * answers. The answers stay encrypted on the server and leave it only in the user's export.
 */
export const savedScreeningSchema = z.object({
  status: z.enum(ScreeningStatus),
  /** Set exactly when `status` is `Referred`. */
  referral: z.enum(ReferralKind).nullable(),
  nutritionOff: z.boolean(),
  excludedAreas: z.array(z.enum(BodyArea)),
  startingLevel: z.enum(StartingLevel),
  trainingMode: z.enum(TrainingMode),
  takenAt: z.iso.datetime(),
  /** When the person stated "a doctor has said I can train", if they have. */
  doctorOkAt: z.iso.datetime().nullable(),
});
