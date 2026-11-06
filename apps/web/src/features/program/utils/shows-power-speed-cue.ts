import { Emphasis } from '@stamina/domain';
import { SessionBlockKind } from '../enums/session-block-kind.ts';

/** The power-and-speed cue sits beside the main-strength work of a power-and-speed Block. */
export function showsPowerSpeedCue(kind: SessionBlockKind, emphasis: Emphasis): boolean {
  return kind === SessionBlockKind.MainStrength && emphasis === Emphasis.PowerSpeed;
}
