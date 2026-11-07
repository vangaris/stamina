import type { AdaptationRule } from '../enums/adaptation-rule.ts';
import type { AdaptationHistoryEntry } from '../types.ts';

/** Whether an Adaptation for this rule and trigger is already stored, in any status. */
export function isRaised(
  history: readonly AdaptationHistoryEntry[],
  ruleId: AdaptationRule,
  triggerKey: string,
): boolean {
  return history.some((entry) => entry.ruleId === ruleId && entry.triggerKey === triggerKey);
}
