import { STOP_FLAG_EFFECTS } from '../config.ts';
import type { StopFlag } from '../enums/stop-flag.ts';
import type { StopFlagEffect } from '../types.ts';

/** What reporting `flag` does: its action, whether to show the emergency number, and which Screening questions are asked again. */
export function stopFlagEffect(flag: StopFlag): StopFlagEffect {
  return STOP_FLAG_EFFECTS[flag];
}
