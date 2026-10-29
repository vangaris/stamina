import { createAppMediator, createServices, type Mediator } from '@stamina/app-core';
import { useHealthStore } from './stores/health.ts';

let mediator: Mediator | undefined;

function apiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://127.0.0.1:8787' : '');
  // A production build without the API URL must fail loudly, not call localhost.
  if (!url) throw new Error('VITE_API_URL was not set when this app was built');
  return url;
}

/** One mediator per app; built lazily because stores need an active Pinia. */
export function useMediator(): Mediator {
  mediator ??= createAppMediator({
    services: createServices({ apiBaseUrl: apiBaseUrl() }),
    stores: { health: { set: (state) => useHealthStore().set(state) } },
  });
  return mediator;
}
