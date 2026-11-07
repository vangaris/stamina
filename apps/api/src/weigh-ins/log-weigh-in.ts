import type { LogWeighIn, LogWeighInResult } from '@stamina/contracts';
import { isWeighInDateInRange } from '@stamina/domain';
import { weighIn } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';

/**
 * Stores one weigh-in for the user: today (UTC, from `now`) unless the entry names a day, which
 * `isWeighInDateInRange` must accept (at most `MAX_ACTIVITY_FUTURE_DAYS` ahead, a device clock or
 * time zone ahead, and at most `MAX_WEIGH_IN_PAST_DAYS` back); any other day stores nothing and
 * returns `null`. Every call adds a row, so a second weigh-in on the same day is kept and the
 * latest one wins.
 */
export async function logWeighIn(
  db: Db,
  userId: string,
  entry: LogWeighIn,
  now: Date,
): Promise<LogWeighInResult | null> {
  const today = now.toISOString().slice(0, 10);
  const date = entry.date ?? today;
  if (!isWeighInDateInRange(today, date)) return null;

  const [stored] = await withUser(db, userId, (tx) =>
    tx.insert(weighIn).values({ userId, weightKg: entry.weightKg, date }).returning(),
  );
  return { date: stored!.date, weightKg: stored!.weightKg };
}
