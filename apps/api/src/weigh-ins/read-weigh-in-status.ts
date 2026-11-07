import { DAYS_IN_WEEK, addDays } from '@stamina/domain';
import type { Progress } from '@stamina/contracts';
import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { weighIn } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';

/**
 * The user's latest weigh-in (newest day, then newest entry) and whether one is due: none is
 * dated in the 7-day week that starts on `weekStartsOn`.
 */
export async function readWeighInStatus(
  tx: UserTx,
  userId: string,
  weekStartsOn: string,
): Promise<Progress['weighIn']> {
  const [latest] = await tx
    .select({ date: weighIn.date, weightKg: weighIn.weightKg })
    .from(weighIn)
    .where(eq(weighIn.userId, userId))
    .orderBy(desc(weighIn.date), desc(weighIn.createdAt))
    .limit(1);

  const [thisWeek] = await tx
    .select({ id: weighIn.id })
    .from(weighIn)
    .where(
      and(
        eq(weighIn.userId, userId),
        gte(weighIn.date, weekStartsOn),
        lt(weighIn.date, addDays(weekStartsOn, DAYS_IN_WEEK)),
      ),
    )
    .limit(1);

  return { latest: latest ?? null, due: thisWeek === undefined };
}
