import { eq } from 'drizzle-orm';
import { session } from '../db/schema.ts';
import type { UserTx } from '../db/types.ts';

/** The id of the revision that replaced this Session, or `null` while it is the current one (or unknown). */
export async function readSupersedingSessionId(
  tx: UserTx,
  sessionId: string,
): Promise<string | null> {
  const [newer] = await tx
    .select({ id: session.id })
    .from(session)
    .where(eq(session.supersedesId, sessionId));
  return newer?.id ?? null;
}
