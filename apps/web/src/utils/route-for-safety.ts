import type { SafetyState } from '@stamina/app-core';
import { ROUTE_FOR_SAFETY } from '../safety-config.ts';
import type { RoutePath } from '../enums/route-path.ts';

/** The screen a person belongs on, given where they stand before training. */
export function routeForSafety(state: SafetyState): RoutePath {
  return ROUTE_FOR_SAFETY[state.status];
}
