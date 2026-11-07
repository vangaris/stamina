import type { Adaptation, ProgramSession } from '@stamina/contracts';
import { AdaptationChangeKind, AdaptationRule, AdaptationStatus } from '@stamina/domain';
import { newId } from '@stamina/ids';

/**
 * A pending suggestion that lightens `session` (a poor Check-in on its day), based on the
 * Session as it is now; `overrides` replace any field, for another change or a stale basis.
 */
export function buildAdaptation(
  session: ProgramSession,
  overrides: Partial<Adaptation> = {},
): Adaptation {
  return {
    id: newId(),
    ruleId: AdaptationRule.PoorCheckin,
    change: { kind: AdaptationChangeKind.LightenSession, sessionId: session.id },
    params: { sleep: 1, soreness: 2, energy: 2 },
    basis: [{ sessionId: session.id, revision: session.revision }],
    validUntil: session.date,
    status: AdaptationStatus.Pending,
    createdAt: '2026-11-06T09:00:00.000Z',
    decidedAt: null,
    ...overrides,
  };
}
