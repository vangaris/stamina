import type { SQL } from 'drizzle-orm';
import type { Db } from '../../src/db/client.ts';

/** Raw rows of a statement; `Db` is driver-agnostic, so `execute` is untyped (both drivers return `{ rows }`). */
export async function queryRows<Row>(db: Db, query: SQL): Promise<Row[]> {
  return ((await db.execute(query)) as { rows: Row[] }).rows;
}
