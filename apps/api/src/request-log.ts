import type { Context, MiddlewareHandler } from 'hono';
import { matchedRoutes } from 'hono/route';

/** Variables handlers and middleware share through the Hono context. */
export interface AppEnv {
  Variables: {
    requestId: string;
    /** Pseudonymous user ID (never an email or name). Set by authentication once it exists. */
    userId?: string;
  };
}

/**
 * The only fields a request log line may carry. Health data reaches the API in bodies, query
 * strings, path parameters, headers and error messages, so none of those are ever read here.
 */
export interface RequestLogRecord {
  request_id: string;
  route: string;
  status: number;
  latency_ms: number;
  user_id?: string;
  error_type?: string;
}

/** Receives one JSON line per request. */
export type LogSink = (line: string) => void;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CLASS_NAME = /^[A-Za-z_$][\w$]{0,63}$/;
const UNMATCHED = 'unmatched';

/** A caller's own request ID is kept only when it is a UUID, so it cannot smuggle free text into logs. */
function resolveRequestId(inbound: string | undefined): string {
  return inbound !== undefined && UUID.test(inbound) ? inbound.toLowerCase() : crypto.randomUUID();
}

/** The matched route pattern (`/meals/:id`), never the URL. Wildcard middleware does not count as a match. */
function routePattern(c: Context): string {
  const handlers = matchedRoutes(c).filter((r) => r.path !== '*' && r.path !== '/*');
  return handlers.at(-1)?.path ?? UNMATCHED;
}

/** Class name only: messages and stacks can embed what the user typed. */
export function errorType(error: unknown): string {
  const name = error instanceof Error ? error.constructor.name : 'NonError';
  return CLASS_NAME.test(name) ? name : 'Error';
}

/** Emits exactly one allowlisted JSON line per request, after the response is built. */
export function requestLog(sink: LogSink): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const started = performance.now();
    const requestId = resolveRequestId(c.req.header('x-request-id'));
    c.set('requestId', requestId);
    c.header('x-request-id', requestId);

    await next();

    const record: RequestLogRecord = {
      request_id: requestId,
      route: routePattern(c),
      status: c.res.status,
      latency_ms: Math.round(performance.now() - started),
    };
    const userId = c.get('userId');
    if (typeof userId === 'string' && userId !== '') record.user_id = userId;
    if (c.error) record.error_type = errorType(c.error);

    try {
      sink(JSON.stringify(record));
    } catch {
      // Logging must never fail a request.
    }
  };
}
