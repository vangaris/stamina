import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';
import type { DbHandle } from './types.ts';

/** Plain TCP through `pg`: the Node dev server, the tests and migrations. Never imported by the Worker. */
export function createPgDb(connectionString: string): DbHandle {
  const pool = new pg.Pool({ connectionString });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}
