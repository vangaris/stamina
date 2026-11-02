import { normalizeInviteCode } from '@stamina/domain';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.ts';
import { invite } from '../db/schema.ts';

/**
 * Whether what someone typed is a code they can still use. Open means `redeemed_at` is null:
 * `redeemed_by` is cleared when its user is deleted, and that must not reopen a used code.
 * Runs on the connection role (nobody is signed in yet). Malformed, unknown and used codes
 * are the same `false`.
 */
export async function isInviteOpen(db: Db, input: string): Promise<boolean> {
  const code = normalizeInviteCode(input);
  if (code === undefined) return false;
  const rows = await db
    .select({ code: invite.code })
    .from(invite)
    .where(and(eq(invite.code, code), isNull(invite.redeemedAt)))
    .limit(1);
  return rows.length === 1;
}
