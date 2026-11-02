import { and, eq, isNull } from 'drizzle-orm';
import { invite } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';

/**
 * Marks the invite as used by `userId`. One conditional UPDATE on `redeemed_at is null` (the
 * definition of open, see `isInviteOpen`), so two people racing for the same code cannot both
 * win: the second waits for the first's transaction, re-checks and updates nothing. Returns
 * whether this call took the code. Unknown, malformed and already used codes are the same
 * `false`, so a caller cannot tell them apart.
 */
export async function redeemInvite(tx: UserTx, code: string, userId: string): Promise<boolean> {
  const taken = await tx
    .update(invite)
    .set({ redeemedBy: userId, redeemedAt: new Date() })
    .where(and(eq(invite.code, code), isNull(invite.redeemedAt)))
    .returning({ code: invite.code });
  return taken.length === 1;
}
