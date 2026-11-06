import { createAppRegistry } from './create-app-registry.ts';
import { createSyncRunner } from './create-sync-runner.ts';
import type { AppMediatorOptions, SyncRunner } from './types.ts';

/** The app's sync: the offline queue replayed through the app's handlers. Make one per app, next to the mediator. */
export function createAppSync({ services, stores }: AppMediatorOptions): SyncRunner {
  return createSyncRunner({ services, stores, registry: createAppRegistry() });
}
