import type { MiddlewareHandler } from 'hono';
import { ApiErrorCode } from '../enums/api-error-code.ts';
import { HttpHeader } from '../enums/http-header.ts';
import type { AppEnv } from '../request-log.ts';
import { WWW_AUTHENTICATE_CHALLENGE } from './config.ts';
import { parseBearerToken } from './parse-bearer-token.ts';
import type { TokenVerifier } from './types.ts';

/**
 * Requires a valid Bearer JWT and sets `c.var.userId` (the pseudonymous ID the request log
 * carries). The Authorization header is read here only; it is never logged, echoed or reported.
 */
export function authenticate(verifier: TokenVerifier): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const token = parseBearerToken(c.req.header(HttpHeader.Authorization));
    const result = token === undefined ? undefined : await verifier.verify(token);
    if (result?.ok !== true) {
      c.header(HttpHeader.WwwAuthenticate, WWW_AUTHENTICATE_CHALLENGE);
      return c.json({ error: ApiErrorCode.Unauthorized }, 401);
    }
    c.set('userId', result.userId);
    await next();
  };
}
