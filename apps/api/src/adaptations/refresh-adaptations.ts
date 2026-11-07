import { proposeAdaptations, type AdaptationContext } from '@stamina/domain';
import { adaptation } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';
import { readAdaptationContext } from './read-adaptation-context.ts';

/**
 * Stores the Adaptations the rules raise for the user at `now` that are not stored yet, and
 * returns the context they were raised on (`null` when there is nothing to adapt: no Program, or
 * the engine cannot run for the person). Safe to call again: a `(rule, trigger, ask)` already
 * stored is skipped by the unique key. The caller holds `lockUser`, so two requests do not
 * propose the same thing twice and a read-then-write sees one consistent week.
 */
export async function refreshAdaptations(
  tx: UserTx,
  userId: string,
  now: Date,
): Promise<AdaptationContext | null> {
  const context = await readAdaptationContext(tx, userId, now);
  if (context === null) return null;
  const proposals = proposeAdaptations(context);
  if (proposals.length > 0) {
    await tx
      .insert(adaptation)
      .values(
        proposals.map((proposal) => ({
          userId,
          ruleId: proposal.ruleId,
          triggerKey: proposal.triggerKey,
          ask: proposal.ask,
          change: proposal.change,
          params: proposal.params,
          basis: proposal.basis,
          validUntil: proposal.validUntil,
          createdAt: now,
        })),
      )
      .onConflictDoNothing();
  }
  return context;
}
