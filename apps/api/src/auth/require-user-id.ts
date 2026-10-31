import type { Context } from 'hono';
import type { AppEnv } from '../request-log.ts';

/** The authenticated user's ID. Only valid behind `authenticate`; reaching it without one is a bug. */
export function requireUserId(c: Context<AppEnv>): string {
  const userId = c.get('userId');
  if (userId === undefined) throw new Error('route is missing the authenticate middleware');
  return userId;
}
