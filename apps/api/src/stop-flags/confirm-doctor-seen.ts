import {
  RecordStatus,
  type ConfirmDoctorSeen,
  type ConfirmDoctorSeenResult,
} from '@stamina/contracts';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { lockUser } from '../db/lock-user.ts';
import { stopFlag } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { PAUSING_FLAGS } from './config.ts';
import { readStopState } from './read-stop-state.ts';

/**
 * "A doctor has seen me / has cleared me": stamps `confirmed_at` on every open pausing flag of the
 * user whose kind is in `flags` (the kinds the person saw) in one statement, which ends those
 * pauses, and answers with where they stand afterwards. A kind reported later, or from another
 * device, stays paused; a kind that is not open changes nothing. Fever and new pain never pause,
 * so they are left alone: a rest day passes by itself and an excluded area stays excluded.
 * Stamina records the statement, it never issues clearance.
 */
export async function confirmDoctorSeen(
  db: Db,
  userId: string,
  { flags }: ConfirmDoctorSeen,
): Promise<ConfirmDoctorSeenResult> {
  const kinds = PAUSING_FLAGS.filter((kind) => flags.includes(kind));
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);
    if (kinds.length > 0) {
      await tx
        .update(stopFlag)
        .set({ confirmedAt: sql`now()` })
        .where(
          and(
            eq(stopFlag.userId, userId),
            isNull(stopFlag.confirmedAt),
            inArray(stopFlag.flag, kinds),
          ),
        );
    }
    return { status: RecordStatus.Saved, stop: await readStopState(tx, userId) };
  });
}
