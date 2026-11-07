import type { Adaptation } from '@stamina/contracts';
import { AdaptationChangeKind, AdaptationRule, AdaptationStatus } from '@stamina/domain';

export const SESSION_ID = '00000000-0000-4000-8000-000000000001';

let counter = 0;

/** A pending "move the Session" suggestion (Thu 2026-11-05 to Fri 2026-11-06); `id` differs on every call. */
export function makeAdaptation(overrides: Partial<Adaptation> = {}): Adaptation {
  counter += 1;
  return {
    id: `20000000-0000-4000-8000-${String(counter).padStart(12, '0')}`,
    ruleId: AdaptationRule.UnplannedActivity,
    change: {
      kind: AdaptationChangeKind.MoveSession,
      sessionId: SESSION_ID,
      from: '2026-11-05',
      to: '2026-11-06',
    },
    params: { load: 540, minutes: 90, hours: 24, windowHours: 48 },
    basis: [{ sessionId: SESSION_ID, revision: 1 }],
    validUntil: '2026-11-05',
    status: AdaptationStatus.Pending,
    createdAt: '2026-11-04T18:00:00.000Z',
    decidedAt: null,
    ...overrides,
  };
}
