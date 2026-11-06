import { createSystemTimer } from './services/create-system-timer.ts';
import { SyncTrigger } from './enums/sync-trigger.ts';
import type { StartSyncOptions } from './types.ts';

/**
 * Syncs now (the app opened), on every `SyncTrigger` event from `target` and, when
 * `retryEveryMs` is set, every that many milliseconds (so a request queued after a transient
 * failure while online is not left until the next focus or online event; a sync with an empty
 * queue does nothing). Returns a function that stops all of it. A sync that fails to even read the
 * queue is dropped quietly: the next trigger tries again, and the entries stay where they are.
 */
export function startSync({
  sync,
  target,
  retryEveryMs,
  timer = createSystemTimer(),
}: StartSyncOptions): () => void {
  const trigger = () => {
    sync().catch(() => undefined);
  };
  const triggers = Object.values(SyncTrigger);
  for (const type of triggers) target.addEventListener(type, trigger);
  const stopRetrying = retryEveryMs === undefined ? undefined : timer.every(trigger, retryEveryMs);
  trigger();
  return () => {
    for (const type of triggers) target.removeEventListener(type, trigger);
    stopRetrying?.();
  };
}
