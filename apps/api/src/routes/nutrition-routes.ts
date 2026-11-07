import {
  HttpStatus,
  NutritionSubpath,
  SaveNutritionSetupStatus,
  nutritionSetupSchema,
  nutritionStateSchema,
  saveNutritionSetupResultSchema,
} from '@stamina/contracts';
import { MAX_ACTIVITY_FUTURE_DAYS, daysBetween } from '@stamina/domain';
import { Hono } from 'hono';
import { z } from 'zod';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import { withUser } from '../db/with-user.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import { readNutrition, saveNutritionSetup } from '../nutrition/index.ts';
import type { AppEnv } from '../request-log.ts';

const querySchema = z.object({ date: z.iso.date() });

/**
 * Meals: `GET /nutrition?date=YYYY-MM-DD` (what Meals shows for the person's calendar day:
 * `locked`, `off` or `ready` with the day's targets and water so far; a day more than
 * `MAX_ACTIVITY_FUTURE_DAYS` ahead of today (UTC) is a `400`) and `PUT /nutrition/setup` (the
 * Unlock Meals setup: `200` `Saved` with Meals for today, `422` `Rejected` when Nutrition is
 * off or a body direction is sent without a body-composition Goal, `404` before a profile
 * exists). Bodies and answers are health data: never logged, and an invalid request is never
 * echoed.
 */
export function nutritionRoutes({
  db,
  auth,
  now,
}: {
  db: Db;
  auth: TokenVerifier;
  now: () => Date;
}) {
  const routes = new Hono<AppEnv>();

  routes.get('/', authenticate(auth), async (c) => {
    const query = querySchema.safeParse(c.req.query());
    const today = now().toISOString().slice(0, 10);
    if (!query.success || daysBetween(today, query.data.date) > MAX_ACTIVITY_FUTURE_DAYS) {
      return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);
    }
    const userId = requireUserId(c);
    const state = await withUser(db, userId, (tx) =>
      readNutrition(tx, userId, query.data.date, now()),
    );
    return c.json(nutritionStateSchema.parse(state));
  });

  routes.put(`/${NutritionSubpath.Setup}`, authenticate(auth), async (c) => {
    const body = nutritionSetupSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) {
      return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);
    }
    const result = await saveNutritionSetup(db, requireUserId(c), body.data, now());
    if (result === null) return c.json({ error: ApiErrorCode.NotFound }, HttpStatus.NotFound);
    return c.json(
      saveNutritionSetupResultSchema.parse(result),
      result.status === SaveNutritionSetupStatus.Saved
        ? HttpStatus.Ok
        : HttpStatus.UnprocessableEntity,
    );
  });

  return routes;
}
