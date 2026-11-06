import { AppError, AppErrorCode, getSafety, SafetyStatus } from '@stamina/app-core';
import { toLocalDate } from '@stamina/dates';
import { isTrainingBlocked } from '@stamina/domain';
import type { NavigationGuard } from 'vue-router';
import { RouteName } from '../enums/route-name.ts';
import { RoutePath } from '../enums/route-path.ts';
import type { SafetyGuardOptions } from '../types.ts';
import { routeForSafety } from './route-for-safety.ts';

/**
 * Stops a person who has not finished onboarding, consent and Screening (or who is Referred) from
 * opening any screen that is not on the ungated list, and sends them to the step they need. A
 * route is gated unless it is listed, so a new screen is safe by default; a path that matches no
 * route shows nothing and is left alone. Asks the server on every navigation, so a withdrawn
 * consent or a newer Screening takes effect at once.
 *
 * A Session cannot be opened on a day training is blocked (the day of a reported fever): that
 * route goes to Today, which says it is a rest day. A person already inside a Session is taken
 * out by their own Stop button, so only opening one is checked.
 *
 * An Unauthorized answer goes to the start screen, signed out or not: the server's 401 is the
 * same for no session and for an expired one, so the guard cannot tell a visitor from a signed-in
 * person whose session lapsed, and letting it through would show that person a gated screen
 * unchecked. If the question cannot be answered for another reason (offline, server down) the
 * person goes to the Screening screen, which says so and offers a retry.
 */
export function createSafetyGuard({
  ungatedRoutes,
  mediator,
  now = () => new Date(),
}: SafetyGuardOptions): NavigationGuard {
  return async (to) => {
    const listed = to.name !== undefined && ungatedRoutes.some((name) => name === to.name);
    if (listed || to.matched.length === 0) return true;
    try {
      const state = await mediator().send(getSafety());
      if (state.status !== SafetyStatus.Ready) return routeForSafety(state);
      const blocked =
        to.name === RouteName.SessionDetail && isTrainingBlocked(state.stop, toLocalDate(now()));
      return blocked ? RoutePath.Today : true;
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return RoutePath.Start;
      }
      return RoutePath.Screening;
    }
  };
}
