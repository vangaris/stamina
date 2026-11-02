import { CONSENT_TEXT_VERSIONS, ConsentPurpose } from '@stamina/domain';
import { and, eq, isNull } from 'drizzle-orm';
import { consent } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';

/** The purposes the user has granted at the current text version and not withdrawn. */
export async function readGrantedPurposes(tx: UserTx, userId: string): Promise<ConsentPurpose[]> {
  const rows = await tx
    .select({ purpose: consent.purpose, textVersion: consent.textVersion })
    .from(consent)
    .where(and(eq(consent.userId, userId), isNull(consent.withdrawnAt)));
  return Object.values(ConsentPurpose).filter((purpose) =>
    rows.some(
      (row) => row.purpose === purpose && row.textVersion === CONSENT_TEXT_VERSIONS[purpose],
    ),
  );
}
