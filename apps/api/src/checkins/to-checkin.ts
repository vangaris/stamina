import type { Checkin } from '@stamina/contracts';
import type { CheckinRow } from './types.ts';

/** A stored Check-in row as the contract's `Checkin`. */
export function toCheckin(row: CheckinRow): Checkin {
  return {
    id: row.id,
    date: row.date,
    sleep: row.sleep,
    soreness: row.soreness,
    energy: row.energy,
    submittedAt: row.submittedAt.toISOString(),
  };
}
