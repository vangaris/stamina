import {
  HttpStatus,
  exerciseListResponseSchema,
  exerciseQuerySchema,
  type ExerciseQuery,
} from '@stamina/contracts';
import { selectExercises, type ExerciseFilter } from '@stamina/domain';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import { exercise } from '../db/schema.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import { toExercise } from '../exercises/index.ts';
import type { AppEnv } from '../request-log.ts';

/**
 * One value per key. A repeated key (`?excludeAreas=knee&excludeAreas=hip`) is rejected, never
 * reduced to its first or last value: that would drop an exclusion without telling anyone.
 */
function singleValues(queries: Record<string, string[]>): Record<string, string> | null {
  const single: Record<string, string> = {};
  for (const [key, values] of Object.entries(queries)) {
    const [only, ...more] = values;
    if (only === undefined || more.length > 0) return null;
    single[key] = only;
  }
  return single;
}

/** An absent query part does not narrow the result, so it must stay absent in the filter. */
function toFilter(query: ExerciseQuery): ExerciseFilter {
  return {
    ...(query.equipment ? { equipment: query.equipment } : {}),
    ...(query.locations ? { locations: query.locations } : {}),
    ...(query.slots ? { slots: query.slots } : {}),
    ...(query.excludeAreas ? { excludedAreas: query.excludeAreas } : {}),
  };
}

/**
 * `GET /exercises`: the curated library, filtered by what the person has, where they train, the
 * Session slot and the body areas to keep out (see `exerciseQuerySchema`). The filter is the
 * domain's `selectExercises`: an exercise that loads an excluded area is never returned. The whole
 * library is about 150 rows, so there is no pagination. Read as the app role like any other table.
 */
export function exerciseRoutes({ db, auth }: { db: Db; auth: TokenVerifier }) {
  const routes = new Hono<AppEnv>();

  routes.get('/', authenticate(auth), async (c) => {
    const userId = requireUserId(c);
    const single = singleValues(c.req.queries());
    const query = single && exerciseQuerySchema.safeParse(single);
    // A rejected value is never echoed.
    if (!query?.success)
      return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);

    const rows = await withUser(db, userId, (tx) =>
      // "C" collation: plain byte order, so the order does not depend on the database's locale.
      tx
        .select()
        .from(exercise)
        .orderBy(sql`${exercise.id} collate "C"`),
    );
    return c.json(
      exerciseListResponseSchema.parse({
        exercises: selectExercises(rows.map(toExercise), toFilter(query.data)),
      }),
    );
  });

  return routes;
}
