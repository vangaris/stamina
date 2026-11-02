import {
  AppError,
  AppErrorCode,
  getSafety,
  type SafetyState,
  type SafetyStatus,
} from '@stamina/app-core';
import { ref } from 'vue';
import { RoutePath } from '../../../enums/route-path.ts';
import { useMediator } from '../../../mediator.ts';
import { routeForSafety } from '../../../utils/route-for-safety.ts';
import { SafetyPhase } from '../enums/safety-phase.ts';
import type { SafetyRouteOptions } from '../types.ts';

/**
 * The part every safety screen shares: learn where the person stands, and leave for the screen
 * they belong on unless it is this one (`expected`). A signed-out person goes back to the start;
 * a failed request shows a retry instead of guessing.
 */
export function useSafetyRoute(expected: SafetyStatus, options: SafetyRouteOptions) {
  const mediator = options.mediator ?? useMediator();
  const phase = ref(SafetyPhase.Loading);
  const state = ref<SafetyState | undefined>();

  async function load() {
    phase.value = SafetyPhase.Loading;
    try {
      const current = await mediator.send(getSafety());
      if (current.status !== expected) return options.onNavigate(routeForSafety(current));
      state.value = current;
      phase.value = SafetyPhase.Ready;
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return options.onNavigate(RoutePath.Start);
      }
      phase.value = SafetyPhase.Failed;
    }
  }

  return { mediator, phase, state, load };
}
