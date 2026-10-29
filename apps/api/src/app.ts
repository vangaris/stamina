import { healthResponseSchema, type HealthResponse } from '@stamina/contracts';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import type { AiProvider } from './ai/provider.ts';
import { isOriginAllowed } from './cors.ts';
import type { Db } from './db/client.ts';
import type { ErrorReporter } from './error-reporter.ts';
import { requestLog, type AppEnv, type LogSink } from './request-log.ts';

export interface AppDeps {
  db: Db;
  ai: AiProvider;
  corsOrigins?: readonly string[];
  /** Receives one allowlisted JSON line per request. Defaults to `console.log`. */
  log?: LogSink;
  /** Receives unexpected (5xx) errors. Omitted when no Sentry DSN is configured. */
  errorReporter?: ErrorReporter;
}

export function createApp({
  db,
  corsOrigins = [],
  log = (line) => console.log(line),
  errorReporter,
}: AppDeps) {
  const app = new Hono<AppEnv>();

  app.use('*', requestLog(log));
  app.use(
    '*',
    cors({ origin: (origin) => (isOriginAllowed(origin, corsOrigins) ? origin : null) }),
  );

  app.onError(async (error, c) => {
    if (error instanceof HTTPException && error.status < 500) return error.getResponse();
    await errorReporter?.report(error, { requestId: c.get('requestId') });
    // The message is never echoed: it can embed what the user sent.
    return c.json({ error: 'internal_error' }, 500);
  });

  app.get('/health', async (c) => {
    let body: HealthResponse;
    try {
      await db.execute(sql`select 1`);
      body = { status: 'ok', database: 'up' };
    } catch {
      body = { status: 'degraded', database: 'down' };
    }
    return c.json(healthResponseSchema.parse(body), body.status === 'ok' ? 200 : 503);
  });

  return app;
}
