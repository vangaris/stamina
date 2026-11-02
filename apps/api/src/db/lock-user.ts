import { eq } from 'drizzle-orm';
import { appUser } from './schema.ts';
import type { UserTx } from './types.ts';

/**
 * Makes sure the user's row exists, then locks it until the transaction ends. Writes that must
 * not interleave for one person (two tabs saving a profile, two Screenings, a doctor statement
 * racing a retake) take this first and so run one after the other.
 */
export async function lockUser(tx: UserTx, userId: string): Promise<void> {
  await tx.insert(appUser).values({ id: userId }).onConflictDoNothing();
  await tx.select({ id: appUser.id }).from(appUser).where(eq(appUser.id, userId)).for('update');
}
