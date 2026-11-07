import {
  RecordStatus,
  ScreeningRejection,
  type RecheckScreening,
  type SaveScreeningResult,
  type ScreeningSubmission,
} from '@stamina/contracts';
import { ScreeningQuestion } from '@stamina/domain';
import type { FieldCipher } from '../crypto/index.ts';
import { lockUser } from '../db/lock-user.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { readLatestScreening } from './read-latest-screening.ts';
import { readScreeningGate } from './read-screening-gate.ts';
import { storeScreening } from './store-screening.ts';
import { storedAnswersSchema } from './stored-answers-schema.ts';
import type { StoredAnswers } from './types.ts';

/**
 * Answers some Screening questions again (after a stop flag) and stores the result as a new
 * Screening. The latest Screening's answers (decrypted here, never returned or logged), body
 * areas and starting level carry over; the new answers replace theirs, and the body areas come
 * with the bone, joint and muscle answer. The rest is `saveScreening`: same gate (`ProfileMissing`,
 * `ConsentMissing`), same outcome rules, same storage, and `doctor_ok_at` is not carried over.
 * Without an earlier Screening there is nothing to carry over: `NoScreening`.
 */
export async function recheckScreening(
  db: Db,
  cipher: FieldCipher,
  userId: string,
  recheck: RecheckScreening,
): Promise<SaveScreeningResult> {
  return withUser(db, userId, async (tx): Promise<SaveScreeningResult> => {
    await lockUser(tx, userId);
    const gate = await readScreeningGate(tx, userId);
    if ('status' in gate) return gate;
    const latest = await readLatestScreening(tx, userId);
    if (latest === undefined) {
      return { status: RecordStatus.Rejected, reason: ScreeningRejection.NoScreening };
    }

    const earlier = storedAnswersSchema.parse(
      JSON.parse(await cipher.decrypt(latest.answersEncrypted, userId)),
    );
    const submission: ScreeningSubmission = {
      answers: { ...earlier.answers, ...recheck.answers } as ScreeningSubmission['answers'],
      bodyAreas:
        recheck.answers[ScreeningQuestion.BoneJointMuscle] === undefined
          ? earlier.bodyAreas
          : (recheck.bodyAreas ?? []),
      startingLevel: latest.startingLevel,
    };
    const stored: StoredAnswers = { answers: submission.answers, bodyAreas: submission.bodyAreas };
    const answersEncrypted = await cipher.encrypt(JSON.stringify(stored), userId);
    return storeScreening(tx, userId, gate.goal, submission, answersEncrypted);
  });
}
