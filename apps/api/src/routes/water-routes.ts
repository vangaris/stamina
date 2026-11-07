import { HttpStatus, logWaterResultSchema, logWaterSchema } from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import { WaterIdTakenError, WaterNutritionOffError, logWater } from '../nutrition/index.ts';
import type { AppEnv } from '../request-log.ts';

/**
 * `POST /water`: one quick-log of 250 or 500 ml (`200` with the stored row; a repeat of an id the
 * server has returns the same row and counts once; `400` for any other amount, an invalid body
 * or a day more than `MAX_ACTIVITY_FUTURE_DAYS` ahead; `409` when the id belongs to someone
 * else; `422` with `nutrition_off` when the latest Screening turned Nutrition off, nothing
 * stored). Bodies are health data: never logged, and an invalid body is never echoed.
 */
export function waterRoutes({ db, auth, now }: { db: Db; auth: TokenVerifier; now: () => Date }) {
  const routes = new Hono<AppEnv>();

  routes.post('/', authenticate(auth), async (c) => {
    const body = logWaterSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) {
      return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);
    }

    try {
      const stored = await logWater(db, requireUserId(c), body.data, now());
      if (stored === null) {
        return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);
      }
      return c.json(logWaterResultSchema.parse(stored));
    } catch (error) {
      if (error instanceof WaterIdTakenError) {
        return c.json({ error: ApiErrorCode.IdTaken }, HttpStatus.Conflict);
      }
      if (error instanceof WaterNutritionOffError) {
        return c.json({ error: ApiErrorCode.NutritionOff }, HttpStatus.UnprocessableEntity);
      }
      throw error;
    }
  });

  return routes;
}
