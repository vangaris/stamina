import { createAppMediator, createServices, type Mediator } from '@stamina/app-core';
import { DEV_API_URL } from './config.ts';
import { useHealthStore } from './stores/health.ts';
import { useSessionStore } from './stores/session.ts';
import { resolveServicesEnv } from './utils/resolve-services-env.ts';

let mediator: Mediator | undefined;

/** One mediator per app; built lazily because stores need an active Pinia. */
export function useMediator(): Mediator {
  mediator ??= createAppMediator({
    services: createServices(
      resolveServicesEnv({
        mode: import.meta.env.VITE_SERVICES_MODE,
        apiUrl: import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? DEV_API_URL : undefined),
        origin: window.location.origin,
      }),
    ),
    stores: {
      health: { set: (state) => useHealthStore().set(state) },
      session: { set: (state) => useSessionStore().set(state) },
    },
  });
  return mediator;
}
