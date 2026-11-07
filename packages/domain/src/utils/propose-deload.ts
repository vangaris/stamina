import { DAYS_IN_WEEK, DELOAD_WEEK_IN_BLOCK } from '../config.ts';
import { AdaptationChangeKind } from '../enums/adaptation-change-kind.ts';
import type { AdaptationContext, AdaptationProposal } from '../types.ts';
import { addDays } from './add-days.ts';
import { deloadReason } from './deload-reason.ts';
import { nextDeloadAsk } from './next-deload-ask.ts';
import { upcomingSessions } from './upcoming-sessions.ts';

/**
 * Rule 4: an early Deload over the week's upcoming Sessions. None in the Deload week itself or
 * with no Session left to lighten. Raised on the week's first day; a declined one is asked again
 * (see `nextDeloadAsk`).
 */
export function proposeDeload(context: AdaptationContext): AdaptationProposal[] {
  if (context.weekInBlock === DELOAD_WEEK_IN_BLOCK) return [];
  const sessions = upcomingSessions(context);
  if (sessions.length === 0) return [];
  const reason = deloadReason(context);
  if (reason === null) return [];
  const ask = nextDeloadAsk(context.history, reason.ruleId, context.weekStartsOn, context.now);
  if (ask === null) return [];
  return [
    {
      ruleId: reason.ruleId,
      triggerKey: context.weekStartsOn,
      ask,
      change: { kind: AdaptationChangeKind.DeloadWeek, sessionIds: sessions.map(({ id }) => id) },
      params: reason.params,
      basis: sessions.map(({ id, revision }) => ({ sessionId: id, revision })),
      validUntil: addDays(context.weekStartsOn, DAYS_IN_WEEK - 1),
    },
  ];
}
