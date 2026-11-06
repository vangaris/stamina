import { BodyArea, EMERGENCY_NUMBER, stopFlagEffect, type StopFlag } from '@stamina/domain';
import { OUTCOME_KIND_FOR_ACTION } from '../config.ts';
import { StopOutcomeKind } from '../enums/stop-outcome-kind.ts';
import type { StopOutcomeView } from '../types.ts';

/**
 * What reporting `flag` does, as the person is told. It comes from the domain's effect table and
 * needs no network, so it is shown the instant a flag is picked, offline too. `area` is the body
 * area of a new pain and is ignored for every other flag.
 */
export function toStopOutcome(flag: StopFlag, area?: BodyArea): StopOutcomeView {
  const effect = stopFlagEffect(flag);
  const kind = OUTCOME_KIND_FOR_ACTION[effect.action];
  return {
    kind,
    area: kind === StopOutcomeKind.AreaExcluded ? area : undefined,
    emergencyNumber: effect.showEmergency ? EMERGENCY_NUMBER : undefined,
  };
}
