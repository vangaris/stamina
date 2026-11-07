import { HttpStatus, logMealResultSchema, logMealSchema } from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import { MealIdTakenError, MealNutritionOffError, logMeal } from '../nutrition/index.ts';
import type { AppEnv } from '../request-log.ts';

/**
 * `POST /meal-logs`: what the person did about one meal slot (`200` with the stored row; a
 * repeat of an id the server has returns the same row and stores nothing new; the latest log of
 * a slot wins on the day; `400` for a bad slot index, status, template id, an invalid body or a
 * day more than `MAX_ACTIVITY_FUTURE_DAYS` ahead; `409` when the id belongs to someone else;
 * `422` with `nutrition_off` when the latest Screening turned Nutrition off, nothing stored).
 * Bodies are health data: never logged, and an invalid body is never echoed.
 */
export function mealLogRoutes({ db, auth, now }: { db: Db; auth: TokenVerifier; now: () => Date }) {
  const routes = new Hono<AppEnv>();

  routes.post('/', authenticate(auth), async (c) => {
    const body = logMealSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) {
      return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);
    }

    try {
      const stored = await logMeal(db, requireUserId(c), body.data, now());
      if (stored === null) {
        return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);
      }
      return c.json(logMealResultSchema.parse(stored));
    } catch (error) {
      if (error instanceof MealIdTakenError) {
        return c.json({ error: ApiErrorCode.IdTaken }, HttpStatus.Conflict);
      }
      if (error instanceof MealNutritionOffError) {
        return c.json({ error: ApiErrorCode.NutritionOff }, HttpStatus.UnprocessableEntity);
      }
      throw error;
    }
  });

  return routes;
}
