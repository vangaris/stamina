import { isRetryableFailure } from './utils/is-retryable-failure.ts';
import type {
  MediatorOptions,
  PipelineServices,
  QueuedRequest,
  SyncResult,
  SyncRunner,
} from './types.ts';

/**
 * Replays the offline queue, oldest first, through the registered handlers (not the pipeline: the
 * request was validated and written locally when it was queued, and must not be queued again). An
 * entry is removed once the server will never accept it, so it cannot block the queue forever:
 * its handler resolved (a server `Rejected` or an ignored replay counts), it failed with a
 * permanent client error (not `isRetryableFailure`), it no longer parses against its schema, or
 * its type has no handler. A dropped entry's local write is taken back with the definition's
 * `undoLocal` (nothing to undo for a type with no handler), so the device does not keep what the
 * server will never have. Any other failure (no network, 401, 408, 429, a server error) stops
 * the run with that entry and every later one kept. Requests queued during a run are replayed by
 * the same run, in order. Calls made while a run is in progress share it (single-flight).
 * Offline, nothing is attempted. Nothing is logged: a failed replay's error can carry health data.
 */
export function createSyncRunner<Services extends PipelineServices, Stores>({
  services,
  stores,
  registry,
}: MediatorOptions<Services, Stores>): SyncRunner {
  let running: Promise<SyncResult> | undefined;

  /** True when the entry is off the queue (go on to the next one), false when it stays (stop). */
  async function replay({ id, request }: QueuedRequest) {
    const definition = registry[request.type];
    const parsed = definition?.schema.safeParse(request);
    if (definition && parsed?.success) {
      try {
        await definition.handler(parsed.data, { services, stores, sync });
      } catch (thrown) {
        if (isRetryableFailure(thrown)) return false;
        await definition.undoLocal?.(parsed.data, services);
      }
    } else {
      // Written by an older version of the app: its shape is unknown, so undoing is best effort.
      try {
        await definition?.undoLocal?.(request, services);
      } catch {
        // Nothing to hold on to: the entry is dropped either way.
      }
    }
    await services.offlineQueue.remove(id);
    return true;
  }

  async function run(): Promise<SyncResult> {
    let replayed = 0;
    let stopped = false;
    while (!stopped && services.network.isOnline()) {
      const entries = await services.offlineQueue.pending();
      if (entries.length === 0) break;
      for (const entry of entries) {
        if (!(await replay(entry))) {
          stopped = true;
          break;
        }
        replayed += 1;
      }
    }
    return { replayed, remaining: (await services.offlineQueue.pending()).length };
  }

  const sync: SyncRunner = () => {
    running ??= run().finally(() => {
      running = undefined;
    });
    return running;
  };
  return sync;
}
