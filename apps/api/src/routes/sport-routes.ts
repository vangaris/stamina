import { sportListResponseSchema, type CatalogSport } from '@stamina/contracts';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import { sport } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import type { AppEnv } from '../request-log.ts';
import { toCatalogSport } from '../sports/index.ts';

/**
 * `GET /sports`: the sports the signed-in user may see, as the `sport_visible` policy decides
 * (approved sports, plus drafts this person requested, labelled `beta`), ordered by name. A row
 * whose stored JSON no longer validates is left out and logged by id only, never by content.
 * Read as the app role like any other table.
 */
export function sportRoutes({ db, auth }: { db: Db; auth: TokenVerifier }) {
  const routes = new Hono<AppEnv>();

  routes.get('/', authenticate(auth), async (c) => {
    const userId = requireUserId(c);
    const rows = await withUser(db, userId, (tx) =>
      // "C" collation: plain byte order of the normalized name, independent of the database's locale.
      tx
        .select()
        .from(sport)
        .orderBy(sql`${sport.normalizedName} collate "C"`, sport.id),
    );

    const sports: CatalogSport[] = [];
    for (const row of rows) {
      const catalogSport = toCatalogSport(row);
      if (catalogSport) sports.push(catalogSport);
      else console.error(`sport ${row.id} left out: its stored profile is not valid`);
    }
    return c.json(sportListResponseSchema.parse({ sports }));
  });

  return routes;
}
