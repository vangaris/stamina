import { SyncTrigger } from './enums/sync-trigger.ts';
import type { StartSyncOptions } from './types.ts';

/**
 * Syncs now (the app opened) and again on every `SyncTrigger` event from `target`. Returns a
 * function that stops listening. A sync that fails to even read the queue is dropped quietly:
 * the next trigger tries again, and the entries stay where they are.
 */
export function startSync({ sync, target }: StartSyncOptions): () => void {
  const trigger = () => {
    sync().catch(() => undefined);
  };
  const triggers = Object.values(SyncTrigger);
  for (const type of triggers) target.addEventListener(type, trigger);
  trigger();
  return () => {
    for (const type of triggers) target.removeEventListener(type, trigger);
  };
}
