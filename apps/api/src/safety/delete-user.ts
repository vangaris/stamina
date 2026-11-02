import { eq } from 'drizzle-orm';
import { appUser } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';

/**
 * Hard-deletes the user's `app_user` row; the profile, consents and Screenings go with it
 * (foreign keys cascade). Deleting the sign-in account itself is a later ticket.
 */
export async function deleteUser(db: Db, userId: string): Promise<void> {
  await withUser(db, userId, (tx) => tx.delete(appUser).where(eq(appUser.id, userId)));
}
