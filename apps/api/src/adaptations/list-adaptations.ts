import type { Adaptation } from '@stamina/contracts';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { lockUser } from '../db/lock-user.ts';
import { adaptation, adaptationDecision } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { isBasisCurrent } from './is-basis-current.ts';
import { refreshAdaptations } from './refresh-adaptations.ts';
import { toAdaptation } from './to-adaptation.ts';

/**
 * The user's pending Adaptations that still apply, oldest first (ties by rule, then trigger). The
 * rules run first (`refreshAdaptations`), so what a trigger raised while the app was closed (a
 * missed week, a declined Deload due again) is in the list. A suggestion shows while its last day
 * has not passed (or it has none) and every Session revision it was raised on is still the
 * current one with nothing done in it. Empty when there is nothing to adapt. Runs under `lockUser`
 * because it may store new suggestions.
 */
export async function listAdaptations(db: Db, userId: string, now: Date): Promise<Adaptation[]> {
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);
    const context = await refreshAdaptations(tx, userId, now);
    if (context === null) return [];

    const pending = await tx
      .select({ row: adaptation })
      .from(adaptation)
      .leftJoin(adaptationDecision, eq(adaptationDecision.adaptationId, adaptation.id))
      .where(and(eq(adaptation.userId, userId), isNull(adaptationDecision.adaptationId)))
      .orderBy(asc(adaptation.createdAt), asc(adaptation.ruleId), asc(adaptation.triggerKey));
    return pending
      .filter(
        ({ row }) =>
          (row.validUntil === null || row.validUntil >= context.today) &&
          isBasisCurrent(row.basis, context),
      )
      .map(({ row }) => toAdaptation({ row, decision: null }));
  });
}
