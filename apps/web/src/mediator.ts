import { createAppMediator, createServices, type Mediator } from '@stamina/app-core';
import { useHealthStore } from './stores/health.ts';

let mediator: Mediator | undefined;

/** One mediator per app; built lazily because stores need an active Pinia. */
export function useMediator(): Mediator {
  mediator ??= createAppMediator({
    services: createServices({
      apiBaseUrl: import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8787',
    }),
    stores: { health: { set: (state) => useHealthStore().set(state) } },
  });
  return mediator;
}
