import { PAUSED_CONFIRM_COPY } from '../config.ts';
import { StopOutcomeKind } from '../enums/stop-outcome-kind.ts';
import type { PausedConfirmCopy, StopOutcomeView } from '../types.ts';

/**
 * The words of the paused screen's one button and its hint. "A doctor has seen me" for any
 * pause that needs a doctor to see the person, mixed with others included; "A doctor has cleared
 * me" only when every pause is one a doctor clears (a head knock).
 */
export function toPausedConfirmCopy(outcomes: readonly StopOutcomeView[]): PausedConfirmCopy {
  const onlyCleared =
    outcomes.length > 0 && outcomes.every(({ kind }) => kind === StopOutcomeKind.PausedCleared);
  return onlyCleared
    ? PAUSED_CONFIRM_COPY[StopOutcomeKind.PausedCleared]
    : PAUSED_CONFIRM_COPY[StopOutcomeKind.PausedDoctor];
}
