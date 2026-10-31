import type { DbHandle, OpenDb } from './types.ts';

/**
 * Serves every request from one long-lived handle (a Node process keeps its pool). Closing a
 * request's lease does nothing; the owner closes the real handle at shutdown.
 */
export function sharedDb(handle: DbHandle): OpenDb {
  return () => ({ db: handle.db, close: async () => {} });
}
