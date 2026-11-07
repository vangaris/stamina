import { STOP_BUTTON_PHASES } from '../config.ts';
import type { SessionPhase } from '../enums/session-phase.ts';

/** Whether the Stop button shows on `phase`: on every screen a person trains on, not while loading, failed or done. */
export function hasStopButton(phase: SessionPhase): boolean {
  return STOP_BUTTON_PHASES.includes(phase);
}
