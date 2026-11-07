import type { StopFlag } from '@stamina/domain';
import type { StopOutcomeView } from '../types.ts';
import { toStopOutcome } from './to-stop-outcome.ts';

/**
 * What the paused screen tells the person: one message for each kind of pause among the flags
 * that still pause training, so two flags with the same message do not repeat it. A message
 * shows the emergency number when any of its flags does.
 */
export function toPausedOutcomes(pausing: readonly StopFlag[]): StopOutcomeView[] {
  const byKind = new Map<StopOutcomeView['kind'], StopOutcomeView>();
  for (const flag of pausing) {
    const outcome = toStopOutcome(flag);
    const seen = byKind.get(outcome.kind);
    byKind.set(
      outcome.kind,
      seen
        ? { ...seen, emergencyNumber: seen.emergencyNumber ?? outcome.emergencyNumber }
        : outcome,
    );
  }
  return [...byKind.values()];
}
