import type { Adaptation } from '@stamina/contracts';
import { REASON_MESSAGE_KEYS } from '../config.ts';
import type { MessageSpec } from '../types.ts';

/** The sentence for why a rule raised the suggestion, with the numbers it was raised on. */
export function toReasonMessage({
  ruleId,
  params,
}: Pick<Adaptation, 'ruleId' | 'params'>): MessageSpec {
  return { key: REASON_MESSAGE_KEYS[ruleId], params };
}
