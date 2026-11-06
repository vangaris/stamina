import { RecordStatus, ScreeningRejection, type SaveScreeningResult } from '@stamina/contracts';
import { ConsentPurpose, type Goal } from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { profile } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { readGrantedPurposes } from './read-granted-purposes.ts';

/**
 * What must hold before any health answer is stored: a saved profile and both consents. Answers
 * with the profile's Goal when it does, else the rejection to return.
 */
export async function readScreeningGate(
  tx: UserTx,
  userId: string,
): Promise<{ goal: Goal } | Extract<SaveScreeningResult, { status: RecordStatus.Rejected }>> {
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
  return { goal: current.goal };
}
