import { PAUSING_OUTCOME_KINDS, ROUTE_AFTER_SESSION_STOP } from '../config.ts';
import { RoutePath } from '../../../enums/route-path.ts';
import type { StopOutcomeKind } from '../enums/stop-outcome-kind.ts';

/**
 * Where the person goes once a report is done: the paused screen when it pauses training, Today
 * when it was made in a Session (the Session screen is left), and nowhere otherwise (the sheet
 * just closes).
 */
export function toRouteAfterReport(
  kind: StopOutcomeKind,
  inSession: boolean,
): RoutePath | undefined {
  if (PAUSING_OUTCOME_KINDS.includes(kind)) return RoutePath.Paused;
  return inSession ? ROUTE_AFTER_SESSION_STOP : undefined;
}
