import type { Db } from './client.ts';

/** The transaction handle `withUser` hands to its callback; the same shape on the `pg` and Neon serverless drivers. */
export type UserTx = Parameters<Parameters<Db['transaction']>[0]>[0];
