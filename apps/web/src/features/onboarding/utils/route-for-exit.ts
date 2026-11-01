import type { RouteLocationRaw } from 'vue-router';
import { RoutePath } from '../../../enums/route-path.ts';
import { NOTICE_QUERY_KEY } from '../config.ts';
import { OnboardingExit } from '../enums/onboarding-exit.ts';
import { StartNotice } from '../enums/start-notice.ts';

const ROUTE_FOR_EXIT: Record<OnboardingExit, RouteLocationRaw> = {
  [OnboardingExit.SignedOut]: RoutePath.Start,
  [OnboardingExit.ProfileExists]: RoutePath.Today,
  [OnboardingExit.InviteNeeded]: RoutePath.Start,
  [OnboardingExit.InviteRejected]: {
    path: RoutePath.Start,
    query: { [NOTICE_QUERY_KEY]: StartNotice.InviteRejected },
  },
  [OnboardingExit.Finished]: RoutePath.Today,
};

/** Where each way of leaving the onboarding screens goes. */
export function routeForExit(exit: OnboardingExit): RouteLocationRaw {
  return ROUTE_FOR_EXIT[exit];
}
