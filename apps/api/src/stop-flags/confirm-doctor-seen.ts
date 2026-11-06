import { RecordStatus, type ConfirmDoctorSeenResult } from '@stamina/contracts';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { lockUser } from '../db/lock-user.ts';
import { stopFlag } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { PAUSING_FLAGS } from './config.ts';
import { readStopState } from './read-stop-state.ts';

/**
 * "A doctor has seen me / has cleared me": stamps `confirmed_at` on every open pausing flag of the
 * user in one statement, which ends every pause, and answers with where they stand afterwards.
 * A person with nothing open changes nothing. Fever and new pain never pause, so they are left
 * alone: a rest day passes by itself and an excluded area stays excluded. Stamina records the
 * statement, it never issues clearance.
 */
export async function confirmDoctorSeen(db: Db, userId: string): Promise<ConfirmDoctorSeenResult> {
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);
    await tx
      .update(stopFlag)
      .set({ confirmedAt: sql`now()` })
      .where(
        and(
          eq(stopFlag.userId, userId),
          isNull(stopFlag.confirmedAt),
          inArray(stopFlag.flag, [...PAUSING_FLAGS]),
        ),
      );
    return { status: RecordStatus.Saved, stop: await readStopState(tx, userId) };
  });
}
