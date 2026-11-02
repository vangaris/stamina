import {
  ApiPath,
  DatabaseStatus,
  HealthStatus,
  HttpStatus,
  healthResponseSchema,
  type HealthResponse,
} from '@stamina/contracts';
import { sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import type { AiProvider } from './ai/provider.ts';
import type { TokenVerifier } from './auth/index.ts';
import { isOriginAllowed } from './cors.ts';
import type { FieldCipher } from './crypto/index.ts';
import type { Db } from './db/types.ts';
import { ApiErrorCode } from './enums/api-error-code.ts';
import type { ErrorReporter } from './error-reporter.ts';
import { requestLog, type AppEnv, type LogSink } from './request-log.ts';
import { consentRoutes } from './routes/consent-routes.ts';
import { doctorOkRoutes } from './routes/doctor-ok-routes.ts';
import { exportRoutes } from './routes/export-routes.ts';
import { inviteRoutes } from './routes/invite-routes.ts';
import { meRoutes } from './routes/me-routes.ts';
import { profileRoutes } from './routes/profile-routes.ts';
import { safetyRoutes } from './routes/safety-routes.ts';
import { screeningRoutes } from './routes/screening-routes.ts';

export interface AppDeps {
  db: Db;
  ai: AiProvider;
  /** Verifies the Bearer JWT on authenticated routes. */
  auth: TokenVerifier;
  /** Encrypts Screening answers at rest. */
  cipher: FieldCipher;
  corsOrigins?: readonly string[];
  /** Receives one allowlisted JSON line per request. Defaults to `console.log`. */
  log?: LogSink;
  /** Receives unexpected (5xx) errors. Omitted when no Sentry DSN is configured. */
  errorReporter?: ErrorReporter;
}

export function createApp({
  db,
  auth,
  cipher,
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
    return c.json({ error: ApiErrorCode.InternalError }, HttpStatus.InternalServerError);
  });

  app.get(ApiPath.Health, async (c) => {
    let body: HealthResponse;
    try {
      await db.execute(sql`select 1`);
      body = { status: HealthStatus.Ok, database: DatabaseStatus.Up };
    } catch {
      body = { status: HealthStatus.Degraded, database: DatabaseStatus.Down };
    }
    return c.json(
      healthResponseSchema.parse(body),
      body.status === HealthStatus.Ok ? HttpStatus.Ok : HttpStatus.ServiceUnavailable,
    );
  });

  app.route(ApiPath.Me, meRoutes({ db, auth }));
  app.route(ApiPath.MeExport, exportRoutes({ db, auth, cipher }));
  app.route(ApiPath.Profile, profileRoutes({ db, auth }));
  app.route(ApiPath.Safety, safetyRoutes({ db, auth }));
  app.route(ApiPath.Consent, consentRoutes({ db, auth }));
  app.route(ApiPath.Screening, screeningRoutes({ db, auth, cipher }));
  app.route(ApiPath.DoctorOk, doctorOkRoutes({ db, auth }));
  app.route(ApiPath.InviteCheck, inviteRoutes({ db }));

  return app;
}
