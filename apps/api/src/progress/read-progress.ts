import type { Progress } from '@stamina/contracts';
import { summariseProgress } from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { readLoadAnchor, readLoadEntries } from '../activities/index.ts';
import { profile } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { readWeighInStatus } from '../weigh-ins/index.ts';
import { readPlannedSessions } from './read-planned-sessions.ts';

/**
 * How the week that holds today (UTC, from `now`) is going: the rows read here, the numbers from
 * `summariseProgress` (the Load bars, the planned part of each week, the verdict), and whether a
 * weigh-in is due. Weeks are counted from `readLoadAnchor`, like the week's Load.
 */
export async function readProgress(tx: UserTx, userId: string, now: Date): Promise<Progress> {
  const today = now.toISOString().slice(0, 10);
  const anchor = await readLoadAnchor(tx, userId, today);
  const { sessionEntries, activityRows } = await readLoadEntries(tx, userId);
  const [play] = await tx.select().from(profile).where(eq(profile.userId, userId));

  const summary = summariseProgress({
    anchor,
    today,
    entries: [...sessionEntries, ...activityRows],
    sessions: await readPlannedSessions(tx, userId),
    activities: activityRows,
    play,
  });

  return { ...summary, weighIn: await readWeighInStatus(tx, userId, summary.weekStartsOn) };
}
