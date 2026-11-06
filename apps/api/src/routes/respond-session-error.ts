import { HttpStatus } from '@stamina/contracts';
import type { Context } from 'hono';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import type { AppEnv } from '../request-log.ts';
import { RecordIdTakenError } from '../sessions/index.ts';

/** `409 Conflict` for a taken record id; any other error is rethrown for the app's handler. */
export function respondSessionError(c: Context<AppEnv>, error: unknown) {
  if (error instanceof RecordIdTakenError) {
    return c.json({ error: ApiErrorCode.IdTaken }, HttpStatus.Conflict);
  }
  throw error;
}
