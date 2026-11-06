import { resolveStopState, type StopState } from '@stamina/domain';
import { asc, eq } from 'drizzle-orm';
import { stopFlag } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { toStoredStopFlag } from './to-stored-stop-flag.ts';

/** Where the user stands after every stop flag they reported, in the order reported. */
export async function readStopState(tx: UserTx, userId: string): Promise<StopState> {
  const rows = await tx
    .select()
    .from(stopFlag)
    .where(eq(stopFlag.userId, userId))
    .orderBy(asc(stopFlag.reportedAt), asc(stopFlag.id));
  return resolveStopState(rows.map(toStoredStopFlag));
}
