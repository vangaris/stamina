import { createAppSync, startSync, type Services, type Stores } from '@stamina/app-core';

export interface StartAppSyncOptions {
  services: Services;
  stores: Stores;
  /** The browser's `window`; anything that emits `focus` and `online`. */
  target: EventTarget;
}

/**
 * Starts the app's sync: the offline queue is replayed now (the app opened) and whenever the
 * window gains focus or the phone comes back online. Call it once, with the same services the
 * mediator uses, so the sets the Session screen queued are the ones that get sent. Returns what stops it.
 */
export function startAppSync({ services, stores, target }: StartAppSyncOptions): () => void {
  return startSync({ sync: createAppSync({ services, stores }), target });
}
