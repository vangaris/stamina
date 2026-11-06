import type { Mediator, Services, Stores } from '@stamina/app-core';
import type { RouteName } from './enums/route-name.ts';

export interface SafetyGuardOptions {
  /** Routes anyone may open: sign-in, onboarding and the safety steps. Every other route is gated. */
  ungatedRoutes: readonly RouteName[];
  /** Resolved on each navigation, so the guard can be created before the app's services exist. */
  mediator: () => Mediator;
}

export interface ServicesEnvInput {
  /** `VITE_SERVICES_MODE`; only `dev` changes anything. */
  mode?: string | undefined;
  /** `VITE_API_URL`, or the dev default. */
  apiUrl?: string | undefined;
  /** The origin the app is served from (`location.origin`). */
  origin: string;
}

export interface StartAppSyncOptions {
  services: Services;
  stores: Stores;
  /** The browser's `window`; anything that emits `focus` and `online`. */
  target: EventTarget;
}
