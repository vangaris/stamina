import { RecordStatus, type ReportStopFlag, type ReportStopFlagResult } from '@stamina/contracts';
import { eq } from 'drizzle-orm';
import { lockUser } from '../db/lock-user.ts';
import { session, stopFlag } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { readStopState } from './read-stop-state.ts';
import { StopFlagIdTakenError } from './stop-flag-id-taken-error.ts';

/**
 * Records one stop flag of the user and answers with where they stand afterwards. There is no
 * limit on its day: a flag reported offline arrives whenever the device is next online, and
 * refusing it would delete it. The Session it was reported from is kept only when it is one of the
 * user's own (read under their policies); otherwise it is stored as none, never refused. Replays
 * are safe: an id the user already has changes nothing (`recorded: false`). An id that belongs to
 * another person throws `StopFlagIdTakenError`. Runs under `lockUser`.
 */
export async function reportStopFlag(
  db: Db,
  userId: string,
  entry: ReportStopFlag,
): Promise<ReportStopFlagResult> {
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);

    const [replay] = await tx
      .select({ id: stopFlag.id })
      .from(stopFlag)
      .where(eq(stopFlag.id, entry.id));
    if (replay !== undefined) {
      return {
        status: RecordStatus.Saved,
        recorded: false,
        stop: await readStopState(tx, userId),
      };
    }

    const [ownSession] =
      entry.sessionId === undefined
        ? []
        : await tx.select({ id: session.id }).from(session).where(eq(session.id, entry.sessionId));

    const [stored] = await tx
      .insert(stopFlag)
      .values({
        id: entry.id,
        userId,
        flag: entry.flag,
        date: entry.date,
        bodyArea: entry.bodyArea ?? null,
        sessionId: ownSession?.id ?? null,
      })
      .onConflictDoNothing()
      .returning({ id: stopFlag.id });
    if (stored === undefined) throw new StopFlagIdTakenError();
    return { status: RecordStatus.Saved, recorded: true, stop: await readStopState(tx, userId) };
  });
}
