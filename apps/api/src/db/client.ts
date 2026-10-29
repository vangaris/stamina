import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { Pool as NeonPool } from '@neondatabase/serverless';
import pg from 'pg';
import * as schema from './schema.ts';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface DbHandle {
  db: Db;
  close(): Promise<void>;
}

const isNeonHost = (connectionString: string) =>
  new URL(connectionString).hostname.endsWith('.neon.tech');

/**
 * Neon is reached over WebSockets (works on Deno Deploy and edge runtimes);
 * any other host (local dev, CI Postgres) uses plain TCP.
 */
export function createDb(connectionString: string): DbHandle {
  if (isNeonHost(connectionString)) {
    const pool = new NeonPool({ connectionString });
    return { db: drizzleNeon(pool, { schema }), close: () => pool.end() };
  }
  const pool = new pg.Pool({ connectionString });
  return { db: drizzlePg(pool, { schema }), close: () => pool.end() };
}
