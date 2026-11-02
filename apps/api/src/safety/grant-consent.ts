import type { ConsentGrant, ConsentState } from '@stamina/contracts';
import { CONSENT_TEXT_VERSIONS } from '@stamina/domain';
import { consent } from '../db/schema.ts';
import { lockUser } from '../db/lock-user.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { readGrantedPurposes } from './read-granted-purposes.ts';

/**
 * Records one consent at the current text version, in the language the person read it in. A
 * purpose already granted at this version is left as it is (no second row), also when two
 * requests race: the partial unique index on active grants turns the loser into a no-op.
 */
export async function grantConsent(
  db: Db,
  userId: string,
  { purpose, locale }: ConsentGrant,
): Promise<ConsentState> {
  return withUser(db, userId, async (tx) => {
    await lockUser(tx, userId);
    await tx
      .insert(consent)
      .values({ userId, purpose, locale, textVersion: CONSENT_TEXT_VERSIONS[purpose] })
      .onConflictDoNothing();
    return { granted: await readGrantedPurposes(tx, userId) };
  });
}
