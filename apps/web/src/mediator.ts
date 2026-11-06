import {
  createAppMediator,
  createServices,
  type Mediator,
  type Services,
  type Stores,
} from '@stamina/app-core';
import { DEV_API_URL } from './config.ts';
import { useHealthStore } from './stores/health.ts';
import { useSessionStore } from './stores/session.ts';
import { resolveServicesEnv } from './utils/resolve-services-env.ts';

let services: Services | undefined;
let mediator: Mediator | undefined;

/** One services instance per app (the mediator and the sync share its offline queue and stores); built lazily. */
export function useServices(): Services {
  services ??= createServices(
    resolveServicesEnv({
      mode: import.meta.env.VITE_SERVICES_MODE,
      apiUrl: import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? DEV_API_URL : undefined),
      origin: window.location.origin,
    }),
  );
  return services;
}

/** The stores the handlers write to. They look the Pinia stores up when called, so an active Pinia is only needed then. */
export function useStores(): Stores {
  return {
    health: { set: (state) => useHealthStore().set(state) },
    session: { set: (state) => useSessionStore().set(state) },
  };
}

/** One mediator per app; built lazily because stores need an active Pinia. */
export function useMediator(): Mediator {
  mediator ??= createAppMediator({ services: useServices(), stores: useStores() });
  return mediator;
}
