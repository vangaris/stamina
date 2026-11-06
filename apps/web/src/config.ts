import { RouteName } from './enums/route-name.ts';

/** Same-origin path that proxies Neon Auth (Vite proxy locally, a Pages Function in production). */
export const AUTH_PATH = '/auth';

/** API origin used by `vite dev` when `VITE_API_URL` is not set. */
export const DEV_API_URL = 'http://127.0.0.1:8787';

/**
 * Screens that have no tab bar: people there are signed out or still setting up, or (the Session
 * screen) are in the middle of a workout and need the whole screen.
 */
export const ROUTES_WITHOUT_TABS: readonly RouteName[] = [
  RouteName.SignIn,
  RouteName.Start,
  RouteName.Onboarding,
  RouteName.Consent,
  RouteName.Screening,
  RouteName.Referred,
  RouteName.Reveal,
  RouteName.SessionDetail,
];

/**
 * Screens anyone may open: signing in, onboarding and the safety steps themselves. Every other
 * screen needs onboarding, both consents and a Screening that allows training, so a new route is
 * gated until it is listed here on purpose.
 */
export const UNGATED_ROUTES: readonly RouteName[] = [
  RouteName.SignIn,
  RouteName.Start,
  RouteName.Onboarding,
  RouteName.Consent,
  RouteName.Screening,
  RouteName.Referred,
  RouteName.DevUi,
];
