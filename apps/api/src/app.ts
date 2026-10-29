import { healthResponseSchema, type HealthResponse } from '@stamina/contracts';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AiProvider } from './ai/provider.ts';
import { isOriginAllowed } from './cors.ts';
import type { Db } from './db/client.ts';

export interface AppDeps {
  db: Db;
  ai: AiProvider;
  corsOrigins?: readonly string[];
}

export function createApp({ db, corsOrigins = [] }: AppDeps) {
  const app = new Hono();

  app.use(
    '*',
    cors({ origin: (origin) => (isOriginAllowed(origin, corsOrigins) ? origin : null) }),
  );

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
