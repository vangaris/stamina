import type { StopFlag } from '@stamina/domain';
import type { StopOutcomeView } from '../types.ts';
import { toStopOutcome } from './to-stop-outcome.ts';

/**
 * What the paused screen tells the person: one message for each kind of pause among the flags
 * that still pause training, so two flags with the same message do not repeat it.
 */
export function toPausedOutcomes(pausing: readonly StopFlag[]): StopOutcomeView[] {
  const byKind = new Map<StopOutcomeView['kind'], StopOutcomeView>();
  for (const flag of pausing) {
    const outcome = toStopOutcome(flag);
    if (!byKind.has(outcome.kind)) byKind.set(outcome.kind, outcome);
  }
  return [...byKind.values()];
}
