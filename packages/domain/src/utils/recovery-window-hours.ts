import { DEFAULT_RECOVERY_WINDOW_HOURS } from '../config.ts';
import { SessionFocus } from '../enums/session-focus.ts';
import type { SportDemands } from '../types.ts';

/** Hours after a hard Activity before a heavy Session of this focus: the sport's window, else the default. */
export function recoveryWindowHours(sport: SportDemands | null, focus: SessionFocus): number {
  const windows = sport?.recoveryWindowHours ?? DEFAULT_RECOVERY_WINDOW_HOURS;
  return focus === SessionFocus.Lower ? windows.lower : windows.upper;
}
