import { FAILURE_RPE } from '@stamina/domain';

/** The RPE that stopping with `rir` reps in reserve is: 3 in reserve is RPE 7. */
export function targetRpe(rir: number): number {
  return FAILURE_RPE - rir;
}
