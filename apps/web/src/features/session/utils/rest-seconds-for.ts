import type { SessionSlot } from '@stamina/domain';
import { REST_SECONDS } from '../config.ts';

/** Seconds of rest after a set in this slot; 0 where there is no rest (warm-up, cool-down). */
export function restSecondsFor(slot: SessionSlot): number {
  return REST_SECONDS[slot] ?? 0;
}
