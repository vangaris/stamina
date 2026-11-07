import type { AdaptationRule } from '../enums/adaptation-rule.ts';
import type { AdaptationContext } from '../types.ts';
import { isLapsed } from './is-lapsed.ts';

/**
 * The `ask` number a suggestion for a state of the Program (a repeated week, a restarted Block) is
 * raised with now, or `null` when it is not raised. First ask: 1. One still pending, or any
 * decided: never again. Only lapsed ones before it: again at once, one ask later, over the
 * Sessions as they are now.
 */
export function nextAsk(
  { history, today, sessions }: Pick<AdaptationContext, 'history' | 'today' | 'sessions'>,
  ruleId: AdaptationRule,
  triggerKey: string,
): number | null {
  const own = history.filter((entry) => entry.ruleId === ruleId && entry.triggerKey === triggerKey);
  if (own.length === 0) return 1;
  if (own.some((entry) => !isLapsed(entry, { today, sessions }))) return null;
  return Math.max(...own.map(({ ask }) => ask)) + 1;
}
