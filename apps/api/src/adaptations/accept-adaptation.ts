import {
  AdaptationRejection,
  RecordStatus,
  type AcceptAdaptation,
  type AcceptAdaptationResult,
} from '@stamina/contracts';
import {
  AdaptationChangeKind,
  AdaptationStatus,
  RESTART_RIR_STEP,
  applyAdaptation,
  isBasisCurrent,
} from '@stamina/domain';
import { lockUser } from '../db/lock-user.ts';
import { adaptationDecision } from '../db/schema.ts';
import type { Db, UserTx } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { readProgram } from '../program/index.ts';

import { isSameBasis } from './is-same-basis.ts';
import { readAdaptation } from './read-adaptation.ts';
import { readAdaptationContext } from './read-adaptation-context.ts';
import { reviseSessions } from './revise-sessions.ts';
import { startBlockWeek } from './start-block-week.ts';
import { toAdaptation } from './to-adaptation.ts';

/** The Program as it is now; an Adaptation only exists for a person who has one. */
const readExistingProgram = async (tx: UserTx, userId: string) => {
  const week = await readProgram(tx, userId);
  if (week === null) throw new Error('an Adaptation belongs to a Program');
  return week;
};

/**
 * Applies the user's pending Adaptation, or says why not; `null` when the id is not theirs or does
 * not exist. Accepting an accepted one is a replay (`recorded: false`, the Program as it is);
 * a declined one is `AlreadyDecided`. Otherwise it is `Stale` (nothing stored, nothing decided,
 * the latest week to show instead) when the body's basis is not the stored one, a Session in the
 * basis is no longer the current revision or was started or finished, the suggestion's last day
 * has passed, the engine cannot run for the person now (for example a pause), or the rules say
 * the change no longer applies. Else, in one transaction under `lockUser`, the change is stored
 * as new Session revisions (a new Block for a repeated week or restarted Block) and the decision
 * is recorded at `now`.
 */
export async function acceptAdaptation(
  db: Db,
  userId: string,
  adaptationId: string,
  { basis }: AcceptAdaptation,
  now: Date,
): Promise<AcceptAdaptationResult | null> {
  return withUser(db, userId, async (tx): Promise<AcceptAdaptationResult | null> => {
    await lockUser(tx, userId);
    const stored = await readAdaptation(tx, userId, adaptationId);
    if (stored === null) return null;

    if (stored.decision !== null) {
      if (stored.decision.decision === AdaptationStatus.Declined) {
        return {
          status: RecordStatus.Rejected,
          reason: AdaptationRejection.AlreadyDecided,
          program: await readProgram(tx, userId),
        };
      }
      return {
        status: RecordStatus.Saved,
        recorded: false,
        adaptation: toAdaptation(stored),
        program: await readExistingProgram(tx, userId),
      };
    }

    const stale = async (): Promise<AcceptAdaptationResult> => ({
      status: RecordStatus.Rejected,
      reason: AdaptationRejection.Stale,
      program: await readProgram(tx, userId),
    });

    const { row } = stored;
    const context = await readAdaptationContext(tx, userId, now);
    if (
      context === null ||
      !isSameBasis(basis, row.basis) ||
      !isBasisCurrent(row.basis, context.sessions) ||
      (row.validUntil !== null && row.validUntil < context.today)
    ) {
      return stale();
    }
    const applied = applyAdaptation(row.change, context);
    if (applied === null) return stale();

    if (applied.block === null) {
      await reviseSessions(tx, userId, applied.sessions);
    } else {
      await startBlockWeek(
        tx,
        userId,
        applied,
        context.generation,
        row.change.kind === AdaptationChangeKind.RestartBlock ? RESTART_RIR_STEP : 0,
      );
    }
    const [decision] = await tx
      .insert(adaptationDecision)
      .values({
        adaptationId: row.id,
        userId,
        decision: AdaptationStatus.Accepted,
        decidedAt: now,
      })
      .returning();
    return {
      status: RecordStatus.Saved,
      recorded: true,
      adaptation: toAdaptation({ row, decision: decision! }),
      program: await readExistingProgram(tx, userId),
    };
  });
}
