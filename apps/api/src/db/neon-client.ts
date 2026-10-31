import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema.ts';
import type { DbHandle } from './types.ts';

/**
 * Neon over WebSockets, the only driver the Worker bundle contains (no `pg`). The pool opens
 * its sockets lazily, so it must be created inside a request and closed before that
 * request's isolate work ends: a Worker cannot reuse an I/O object across requests.
 */
export function createNeonDb(connectionString: string): DbHandle {
  const pool = new Pool({ connectionString });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}
