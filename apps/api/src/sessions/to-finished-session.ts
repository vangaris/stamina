import type { FinishedSession } from '@stamina/contracts';
import type { sessionLog } from '../db/schema.ts';

/** A stored finish record as the contract's `FinishedSession`. */
export function toFinishedSession(row: typeof sessionLog.$inferSelect): FinishedSession {
  return {
    id: row.id,
    rpe: row.rpe,
    minutes: row.minutes,
    load: row.load,
    finishedAt: row.finishedAt.toISOString(),
  };
}
