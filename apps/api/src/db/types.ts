import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type * as schema from './schema.ts';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** The transaction handle `withUser` hands to its callback; the same shape on the `pg` and Neon serverless drivers. */
export type UserTx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** A database plus the call that releases its connections. */
export interface DbHandle {
  db: Db;
  close(): Promise<void>;
}

/** Hands out a database handle for one request; the caller closes it when the response is built. */
export type OpenDb = () => DbHandle;
