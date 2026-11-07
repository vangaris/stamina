import {
  AdaptationRejection,
  RecordStatus,
  type DeclineAdaptationResult,
} from '@stamina/contracts';
import { AdaptationStatus } from '@stamina/domain';
import { lockUser } from '../db/lock-user.ts';
import { adaptationDecision } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { readAdaptation } from './read-adaptation.ts';
import { toAdaptation } from './to-adaptation.ts';

/**
 * Declines the user's pending Adaptation ("Keep my plan") at `now`: nothing in the Program
 * changes. `null` when the id is not theirs or does not exist. Declining a declined one is a
 * replay (`recorded: false`, the first decision stands); an accepted one is `AlreadyDecided`.
 * Runs under `lockUser`, so an accept and a decline from two devices are ordered.
 */
export async function declineAdaptation(
  db: Db,
  userId: string,
  adaptationId: string,
  now: Date,
): Promise<DeclineAdaptationResult | null> {
  return withUser(db, userId, async (tx): Promise<DeclineAdaptationResult | null> => {
    await lockUser(tx, userId);
    const stored = await readAdaptation(tx, userId, adaptationId);
    if (stored === null) return null;

    if (stored.decision !== null) {
      if (stored.decision.decision === AdaptationStatus.Accepted) {
        return { status: RecordStatus.Rejected, reason: AdaptationRejection.AlreadyDecided };
      }
      return { status: RecordStatus.Saved, recorded: false, adaptation: toAdaptation(stored) };
    }

    const [decision] = await tx
      .insert(adaptationDecision)
      .values({
        adaptationId: stored.row.id,
        userId,
        decision: AdaptationStatus.Declined,
        decidedAt: now,
      })
      .returning();
    return {
      status: RecordStatus.Saved,
      recorded: true,
      adaptation: toAdaptation({ row: stored.row, decision: decision! }),
    };
  });
}
