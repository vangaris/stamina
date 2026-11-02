import {
  RecordStatus,
  ScreeningRejection,
  type SaveScreeningResult,
  type ScreeningSubmission,
} from '@stamina/contracts';
import {
  ConsentPurpose,
  Goal,
  SCREENING_INSTRUMENT,
  SCREENING_INSTRUMENT_VERSION,
  evaluateScreening,
  isGoalAvailable,
} from '@stamina/domain';
import { eq, sql } from 'drizzle-orm';
import type { FieldCipher } from '../crypto/index.ts';
import { lockUser } from '../db/lock-user.ts';
import { profile, screening } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { readGrantedPurposes } from './read-granted-purposes.ts';
import { toSavedScreening } from './to-saved-screening.ts';
import type { StoredAnswers } from './types.ts';

/**
 * Stores a Screening, or says consent is missing. Both consents must be active before any health
 * answer is accepted. The outcome comes from the domain rules; the answers (and body areas) are
 * encrypted into one field bound to the user ID; a retake is a new row. When Nutrition is now
 * off and the profile's Goal is body composition, the Goal becomes General fitness in the same
 * transaction. Nothing here logs or returns the answers.
 */
export async function saveScreening(
  db: Db,
  cipher: FieldCipher,
  userId: string,
  submission: ScreeningSubmission,
): Promise<SaveScreeningResult> {
  const outcome = evaluateScreening(submission);
  const stored: StoredAnswers = { answers: submission.answers, bodyAreas: submission.bodyAreas };
  const answersEncrypted = await cipher.encrypt(JSON.stringify(stored), userId);

  return withUser(db, userId, async (tx): Promise<SaveScreeningResult> => {
    await lockUser(tx, userId);
    const [current] = await tx
      .select({ goal: profile.goal })
      .from(profile)
      .where(eq(profile.userId, userId));
    if (current === undefined) {
      return { status: RecordStatus.Rejected, reason: ScreeningRejection.ProfileMissing };
    }
    const granted = await readGrantedPurposes(tx, userId);
    if (!Object.values(ConsentPurpose).every((purpose) => granted.includes(purpose))) {
      return { status: RecordStatus.Rejected, reason: ScreeningRejection.ConsentMissing };
    }

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

    const goalChanged = !isGoalAvailable(current.goal, outcome);
    if (goalChanged) {
      await tx
        .update(profile)
        .set({ goal: Goal.GeneralFitness, updatedAt: sql`now()` })
        .where(eq(profile.userId, userId));
    }

    return { status: RecordStatus.Saved, screening: toSavedScreening(row!), goalChanged };
  });
}
