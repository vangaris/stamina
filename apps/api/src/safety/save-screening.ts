import type { SaveScreeningResult, ScreeningSubmission } from '@stamina/contracts';
import type { FieldCipher } from '../crypto/index.ts';
import { lockUser } from '../db/lock-user.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { readScreeningGate } from './read-screening-gate.ts';
import { storeScreening } from './store-screening.ts';
import type { StoredAnswers } from './types.ts';

/**
 * Stores a Screening, or says consent is missing. Both consents must be active before any health
 * answer is accepted. The outcome comes from the domain rules; the answers (and body areas) are
 * encrypted into one field bound to the user ID; a retake is a new row (`storeScreening`). Nothing
 * here logs or returns the answers.
 */
export async function saveScreening(
  db: Db,
  cipher: FieldCipher,
  userId: string,
  submission: ScreeningSubmission,
): Promise<SaveScreeningResult> {
  const stored: StoredAnswers = { answers: submission.answers, bodyAreas: submission.bodyAreas };
  const answersEncrypted = await cipher.encrypt(JSON.stringify(stored), userId);

  return withUser(db, userId, async (tx): Promise<SaveScreeningResult> => {
    await lockUser(tx, userId);
    const gate = await readScreeningGate(tx, userId);
    if ('status' in gate) return gate;
    return storeScreening(tx, userId, gate.goal, submission, answersEncrypted);
  });
}
