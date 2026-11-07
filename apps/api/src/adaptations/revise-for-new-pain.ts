import { reviseAvoidingAreas } from '@stamina/domain';
import type { UserTx } from '../db/types.ts';
import { readAdaptationContext } from './read-adaptation-context.ts';
import { reviseSessions } from './revise-sessions.ts';

/**
 * Rewrites the user's upcoming Sessions (nothing done in them, dated today or later) that load an
 * area now excluded, as new revisions (`reviseAvoidingAreas`). Called after a new-pain stop flag
 * is stored, in the same transaction, so the context already excludes the flag's area. Not a
 * suggestion: nothing is asked and no Adaptation is stored. Does nothing without a Program or
 * when the engine cannot run for the person. The caller holds `lockUser`.
 */
export async function reviseForNewPain(tx: UserTx, userId: string, now: Date): Promise<void> {
  const context = await readAdaptationContext(tx, userId, now);
  if (context === null) return;
  await reviseSessions(tx, userId, reviseAvoidingAreas(context));
}
