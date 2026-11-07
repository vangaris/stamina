import {
  AdaptationSubpath,
  HttpStatus,
  RecordStatus,
  acceptAdaptationResultSchema,
  acceptAdaptationSchema,
  adaptationListSchema,
  declineAdaptationResultSchema,
} from '@stamina/contracts';
import { Hono, type Context } from 'hono';
import { acceptAdaptation, declineAdaptation, listAdaptations } from '../adaptations/index.ts';
import { authenticate, requireUserId, type TokenVerifier } from '../auth/index.ts';
import type { Db } from '../db/types.ts';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import type { AppEnv } from '../request-log.ts';
import { readAdaptationId } from './read-adaptation-id.ts';

const notFound = (c: Context<AppEnv>) =>
  c.json({ error: ApiErrorCode.NotFound }, HttpStatus.NotFound);

/**
 * Adaptations: `GET /adaptations` (the rules run first, then the pending suggestions that still
 * apply, oldest first), `POST /adaptations/{id}/accept` (the body is the `basis` the person saw:
 * `200` `Saved` with the decided suggestion and the Program as it now is, `422` `Rejected` with
 * `stale` or `already-decided` and the latest week to show instead) and
 * `POST /adaptations/{id}/decline` (`200` `Saved`, `422` `Rejected` when accepted already).
 * A suggestion that is not the signed-in user's, or whose id is not a UUID, answers `404`. A
 * repeated decision is replay-safe: `recorded` is false and nothing changes. Suggestions and
 * bodies are health-adjacent: never logged, and an invalid body is never echoed.
 */
export function adaptationRoutes({
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
    const adaptations = await listAdaptations(db, requireUserId(c), now());
    return c.json(adaptationListSchema.parse({ adaptations }));
  });

  routes.post(`/:id/${AdaptationSubpath.Accept}`, authenticate(auth), async (c) => {
    const { id: adaptationId, notFound: badId } = readAdaptationId(c);
    if (badId !== null) return badId;
    const body = acceptAdaptationSchema.safeParse(await c.req.json().catch(() => undefined));
    if (!body.success) return c.json({ error: ApiErrorCode.InvalidRequest }, HttpStatus.BadRequest);

    const result = await acceptAdaptation(db, requireUserId(c), adaptationId, body.data, now());
    if (result === null) return notFound(c);
    return c.json(
      acceptAdaptationResultSchema.parse(result),
      result.status === RecordStatus.Saved ? HttpStatus.Ok : HttpStatus.UnprocessableEntity,
    );
  });

  routes.post(`/:id/${AdaptationSubpath.Decline}`, authenticate(auth), async (c) => {
    const { id: adaptationId, notFound: badId } = readAdaptationId(c);
    if (badId !== null) return badId;

    const result = await declineAdaptation(db, requireUserId(c), adaptationId, now());
    if (result === null) return notFound(c);
    return c.json(
      declineAdaptationResultSchema.parse(result),
      result.status === RecordStatus.Saved ? HttpStatus.Ok : HttpStatus.UnprocessableEntity,
    );
  });

  return routes;
}
