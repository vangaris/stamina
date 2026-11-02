import {
  HttpStatus,
  RecordStatus,
  saveScreeningResultSchema,
  screeningSubmissionSchema,
} from '@stamina/contracts';
import { Hono } from 'hono';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { FieldCipher } from '../crypto/index.ts';
import type { Db } from '../db/types.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import type { AppEnv } from '../request-log.ts';
import { saveScreening } from '../safety/save-screening.ts';

/**
 * `POST /screening`: the answers are health data. They are never logged, a rejected body is
 * never echoed, and the reply carries the outcome only.
 */
export function screeningRoutes({
  db,
  auth,
  cipher,
}: {
  db: Db;
  auth: TokenVerifier;
  cipher: FieldCipher;
}) {
  const routes = new Hono<AppEnv>();
  routes.post('/', authenticate(auth), async (c) => {
    const userId = requireUserId(c);
    const body = screeningSubmissionSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);

    const result = saveScreeningResultSchema.parse(
      await saveScreening(db, cipher, userId, body.data),
    );
    return c.json(
      result,
      result.status === RecordStatus.Saved ? HttpStatus.Ok : HttpStatus.UnprocessableEntity,
    );
  });
  return routes;
}
