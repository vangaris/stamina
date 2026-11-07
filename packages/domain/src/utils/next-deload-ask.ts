import { ADAPTATION_REASK_DAYS, DELOAD_RULES, MS_PER_DAY } from '../config.ts';
import { AdaptationStatus } from '../enums/adaptation-status.ts';
import type { AdaptationRule } from '../enums/adaptation-rule.ts';
import type { AdaptationHistoryEntry } from '../types.ts';

/**
 * The `ask` number a Deload for this rule and week is raised with now, or `null` when it is not
 * raised. First ask: 1. Any Deload of the week pending or accepted: never again. All declined:
 * again, one ask later, once `ADAPTATION_REASK_DAYS` have passed since the last decision.
 */
export function nextDeloadAsk(
  history: readonly AdaptationHistoryEntry[],
  ruleId: AdaptationRule,
  triggerKey: string,
  now: string,
): number | null {
  const week = history.filter(
    (entry) => DELOAD_RULES.includes(entry.ruleId) && entry.triggerKey === triggerKey,
  );
  if (week.some((entry) => entry.status !== AdaptationStatus.Declined)) return null;
  const own = week.filter((entry) => entry.ruleId === ruleId);
  if (own.length === 0) return 1;
  const last = own.reduce((latest, entry) => (entry.ask > latest.ask ? entry : latest));
  if (last.decidedAt === null) return null;
  return Date.parse(now) >= Date.parse(last.decidedAt) + ADAPTATION_REASK_DAYS * MS_PER_DAY
    ? last.ask + 1
    : null;
}
