import { RecordStatus, type SubmitCheckin, type SubmitCheckinResult } from '@stamina/contracts';
import { eq } from 'drizzle-orm';
import { lockUser } from '../db/lock-user.ts';
import { checkin } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { CheckinIdTakenError } from './checkin-id-taken-error.ts';
import { toCheckin } from './to-checkin.ts';

/**
 * Records one Check-in of the user. There is no limit on its day: a Check-in sent offline arrives
 * whenever the device is next online, and refusing it would delete it. Replays are safe: an id the
 * user already has returns the stored Check-in with `recorded: false` and changes nothing. An id
 * that belongs to another person throws `CheckinIdTakenError`. Runs under `lockUser`.
 */
export async function submitCheckin(
  db: Db,
  userId: string,
  entry: SubmitCheckin,
): Promise<SubmitCheckinResult> {
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);

    const [replay] = await tx.select().from(checkin).where(eq(checkin.id, entry.id));
    if (replay !== undefined) {
      return { status: RecordStatus.Saved, recorded: false, checkin: toCheckin(replay) };
    }

    const [stored] = await tx
      .insert(checkin)
      .values({
        id: entry.id,
        userId,
        date: entry.date,
        sleep: entry.sleep,
        soreness: entry.soreness,
        energy: entry.energy,
      })
      .onConflictDoNothing()
      .returning();
    if (stored === undefined) throw new CheckinIdTakenError();
    return { status: RecordStatus.Saved, recorded: true, checkin: toCheckin(stored) };
  });
}
