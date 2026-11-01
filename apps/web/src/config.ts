import { RouteName } from './enums/route-name.ts';

/** Same-origin path that proxies Neon Auth (Vite proxy locally, a Pages Function in production). */
export const AUTH_PATH = '/auth';

/** API origin used by `vite dev` when `VITE_API_URL` is not set. */
export const DEV_API_URL = 'http://127.0.0.1:8787';

/** Screens that have no tab bar: people there are signed out or still setting up. */
export const ROUTES_WITHOUT_TABS: readonly RouteName[] = [
  RouteName.SignIn,
  RouteName.Start,
  RouteName.Onboarding,
];
