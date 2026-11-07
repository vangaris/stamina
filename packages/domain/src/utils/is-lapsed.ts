import { AdaptationStatus } from '../enums/adaptation-status.ts';
import type { AdaptationContext, AdaptationHistoryEntry } from '../types.ts';
import { isBasisCurrent } from './is-basis-current.ts';

/**
 * A pending suggestion that can no longer be shown or accepted: its last day has passed, or a
 * Session it applies to has moved on (revised, started or finished). Decided suggestions never lapse.
 */
export function isLapsed(
  entry: AdaptationHistoryEntry,
  { today, sessions }: Pick<AdaptationContext, 'today' | 'sessions'>,
): boolean {
  return (
    entry.status === AdaptationStatus.Pending &&
    ((entry.validUntil !== null && entry.validUntil < today) ||
      !isBasisCurrent(entry.basis, sessions))
  );
}
