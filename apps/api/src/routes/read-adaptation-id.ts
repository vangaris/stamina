import { HttpStatus } from '@stamina/contracts';
import type { Context } from 'hono';
import { z } from 'zod';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import type { AppEnv } from '../request-log.ts';

/** The route's Adaptation id, or the `404` to answer when it is not a UUID (it cannot be anyone's). */
export function readAdaptationId(
  c: Context<AppEnv>,
): { id: string; notFound: null } | { id: null; notFound: Response } {
  const id = c.req.param('id') ?? '';
  if (z.uuid().safeParse(id).success) return { id, notFound: null };
  return { id: null, notFound: c.json({ error: ApiErrorCode.NotFound }, HttpStatus.NotFound) };
}
