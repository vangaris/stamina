import type { LaunchSportData } from '@stamina/contracts';
import { SportStatus, normalizeSportName } from '@stamina/domain';
import { and, eq, ne, sql } from 'drizzle-orm';
import { isDeepStrictEqual } from 'node:util';
import { sport as sportTable } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { STRAY_NAME_PREFIX } from './config.ts';

/**
 * Seeds the launch sports as drafts, insert-if-missing: a row that exists is never touched, so
 * what the founder changed in the database table editor (profile, status, approval, version)
 * survives every later migrate. Running it twice changes nothing. Run as the table owner
 * (`migrate()` does); the app role cannot write the table.
 *
 * A person may already have asked for a launch sport's name under "Other" (before the sport was
 * added, or after its row was deleted to re-seed it). That stray row holds the name, so each
 * sport is seeded in a transaction: the stray is deleted, and its requests go with it. They are
 * not moved onto the launch row, which is a draft nobody has reviewed: a person sees a draft only
 * if they requested it, so moving them would show them the unreviewed profile. Returns the ids
 * of the launch sports whose stored profile or sources differ from the file (edited or approved
 * in the database, or a file changed since): the files stop applying after the first seed, so
 * `migrate()` logs these.
 */
export async function syncLaunchSports(
  db: Db,
  sports: readonly LaunchSportData[],
): Promise<string[]> {
  const diverged: string[] = [];
  for (const { id, name, profile, sources } of sports) {
    const normalizedName = normalizeSportName(name);
    const stored = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(sportTable).where(eq(sportTable.id, id));
      if (existing) return existing;

      const [stray] = await tx
        .select({ id: sportTable.id })
        .from(sportTable)
        .where(and(eq(sportTable.normalizedName, normalizedName), ne(sportTable.id, id)));
      if (stray) {
        // The unique name must be free before the launch row takes it: rename the stray out of
        // the way, insert the launch row, delete the stray.
        await tx
          .update(sportTable)
          .set({ normalizedName: sql`${STRAY_NAME_PREFIX} || ${sportTable.id}` })
          .where(eq(sportTable.id, stray.id));
      }
      const [inserted] = await tx
        .insert(sportTable)
        .values({
          id,
          name,
          normalizedName,
          status: SportStatus.Draft,
          profile,
          sources,
        })
        .onConflictDoNothing({ target: sportTable.id })
        .returning();
      if (stray) {
        // Someone else seeded it since the check: undo the rename (the transaction rolls back).
        if (!inserted) throw new Error(`Launch sport "${id}" appeared while it was being seeded.`);
        await tx.delete(sportTable).where(eq(sportTable.id, stray.id));
      }
      return inserted;
    });
    if (
      stored &&
      (!isDeepStrictEqual(stored.profile, profile) || !isDeepStrictEqual(stored.sources, sources))
    ) {
      diverged.push(id);
    }
  }
  return diverged;
}
