import {
  RecordStatus,
  type SaveScreeningResult,
  type ScreeningSubmission,
} from '@stamina/contracts';
import {
  Goal,
  SCREENING_INSTRUMENT,
  SCREENING_INSTRUMENT_VERSION,
  evaluateScreening,
  isGoalAvailable,
} from '@stamina/domain';
import { eq, sql } from 'drizzle-orm';
import { profile, screening } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { toSavedScreening } from './to-saved-screening.ts';

/**
 * The shared step of a Screening and a re-check: inserts the new Screening row (the outcome from
 * the domain rules, the answers already encrypted) and, when Nutrition is now off and the
 * profile's Goal is body composition, changes the Goal to General fitness in the same transaction.
 * The caller holds `lockUser` and has passed `readScreeningGate`. A new row never carries over
 * `doctor_ok_at`.
 */
export async function storeScreening(
  tx: UserTx,
  userId: string,
  goal: Goal,
  submission: ScreeningSubmission,
  answersEncrypted: string,
): Promise<SaveScreeningResult> {
  const outcome = evaluateScreening(submission);
  const [row] = await tx
    .insert(screening)
    .values({
      userId,
      instrument: SCREENING_INSTRUMENT,
      instrumentVersion: SCREENING_INSTRUMENT_VERSION,
      answersEncrypted,
      status: outcome.status,
      referral: outcome.referral,
      nutritionOff: outcome.nutritionOff,
      excludedAreas: [...outcome.excludedAreas],
      startingLevel: submission.startingLevel,
    })
    .returning();

  const goalChanged = !isGoalAvailable(goal, outcome);
  if (goalChanged) {
    await tx
      .update(profile)
      .set({ goal: Goal.GeneralFitness, updatedAt: sql`now()` })
      .where(eq(profile.userId, userId));
  }

  return { status: RecordStatus.Saved, screening: toSavedScreening(row!), goalChanged };
}
