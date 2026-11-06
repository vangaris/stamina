import { createAppSync, startSync } from '@stamina/app-core';
import { SYNC_RETRY_MS } from '../config.ts';
import type { StartAppSyncOptions } from '../types.ts';

/**
 * Starts the app's sync: the offline queue is replayed now (the app opened), whenever the
 * window gains focus or the phone comes back online, and every `SYNC_RETRY_MS` while the app is
 * open (a request that failed in a way worth retrying while online waits in the queue until then).
 * Call it once, with the same services the mediator uses, so the sets the Session screen queued
 * are the ones that get sent. Returns what stops it.
 */
export function startAppSync({ services, stores, target }: StartAppSyncOptions): () => void {
  return startSync({
    sync: createAppSync({ services, stores }),
    target,
    retryEveryMs: SYNC_RETRY_MS,
  });
}
