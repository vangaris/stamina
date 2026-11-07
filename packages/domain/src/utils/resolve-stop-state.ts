import { PAUSING_STOP_ACTIONS } from '../config.ts';
import type { BodyArea } from '../enums/body-area.ts';
import { StopAction } from '../enums/stop-action.ts';
import { StopFlag } from '../enums/stop-flag.ts';
import type { StopState, StoredStopFlag } from '../types.ts';
import { stopFlagEffect } from './stop-flag-effect.ts';

/**
 * Where a person stands after the stop flags they reported, in the order reported. `pausing` lists
 * the distinct flags that still pause training (reported and not yet confirmed); `restOn` is the
 * day of the latest fever, when training rests; `excludedAreas` are the distinct areas of every new
 * pain, which stay excluded. A flag confirmed by a doctor-seen statement no longer pauses.
 */
export function resolveStopState(flags: readonly StoredStopFlag[]): StopState {
  const pausing: StopFlag[] = [];
  const excludedAreas: BodyArea[] = [];
  let restOn: string | null = null;

  for (const { flag, date, area, confirmedAt } of flags) {
    const { action } = stopFlagEffect(flag);
    if (PAUSING_STOP_ACTIONS.includes(action) && confirmedAt === null && !pausing.includes(flag)) {
      pausing.push(flag);
    }
    if (action === StopAction.RestToday && (restOn === null || date > restOn)) restOn = date;
    if (action === StopAction.ExcludeArea && area !== null && !excludedAreas.includes(area)) {
      excludedAreas.push(area);
    }
  }
  return { pausing, restOn, excludedAreas };
}
