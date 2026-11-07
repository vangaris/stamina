import { ADAPTATION_REASK_DAYS, DELOAD_RULES, MS_PER_DAY } from '../config.ts';
import { AdaptationStatus } from '../enums/adaptation-status.ts';
import type { AdaptationRule } from '../enums/adaptation-rule.ts';
import type { AdaptationContext } from '../types.ts';
import { isLapsed } from './is-lapsed.ts';

/**
 * The `ask` number a Deload for this rule and week is raised with now, or `null` when it is not
 * raised. First ask: 1. Any Deload of the week still pending or accepted: never again. A lapsed
 * one (its Sessions moved on) is asked again at once, one ask later. A declined one is asked again
 * once `ADAPTATION_REASK_DAYS` have passed since the decision.
 */
export function nextDeloadAsk(
  context: Pick<AdaptationContext, 'history' | 'today' | 'sessions' | 'now'>,
  ruleId: AdaptationRule,
  triggerKey: string,
): number | null {
  const week = context.history.filter(
    (entry) => DELOAD_RULES.includes(entry.ruleId) && entry.triggerKey === triggerKey,
  );
  const open = (entry: (typeof week)[number]) =>
    entry.status === AdaptationStatus.Accepted ||
    (entry.status === AdaptationStatus.Pending && !isLapsed(entry, context));
  if (week.some(open)) return null;
  const own = week.filter((entry) => entry.ruleId === ruleId);
  if (own.length === 0) return 1;
  const last = own.reduce((latest, entry) => (entry.ask > latest.ask ? entry : latest));
  if (last.status === AdaptationStatus.Pending) return last.ask + 1;
  if (last.decidedAt === null) return null;
  return Date.parse(context.now) >= Date.parse(last.decidedAt) + ADAPTATION_REASK_DAYS * MS_PER_DAY
    ? last.ask + 1
    : null;
}
