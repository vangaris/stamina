import { createRemoteJWKSet } from 'jose';
import { unavailableAiProvider } from './ai/provider.ts';
import { createApp } from './app.ts';
import { createTokenVerifier } from './auth/index.ts';
import type { Config } from './config.ts';
import type { OpenDb } from './db/types.ts';
import { createErrorReporter } from './error-reporter.ts';

/** The slice of a Worker's `ExecutionContext` the API needs: work that may outlive the response. */
export interface BackgroundTasks {
  waitUntil(promise: Promise<unknown>): void;
}

export interface Api {
  /**
   * Answers one request. The database handle is opened for this request and closed once the
   * response exists: through `background.waitUntil` when given (a Worker keeps running it after
   * replying), otherwise before returning.
   */
  fetch(request: Request, background?: BackgroundTasks): Promise<Response>;
}

/**
 * The one place the API is assembled from its config: the verifier (with its JWKS cache), the
 * AI provider, the request log and the error reporter are built once; the database handle per
 * request. The Node dev server and the Worker differ only in the `openDb` they pass.
 *
 * Phase A runs the "unavailable" AI provider (rules and templates only).
 */
export function composeApi(config: Config, openDb: OpenDb): Api {
  const auth = createTokenVerifier({
    keys: createRemoteJWKSet(new URL(config.neonAuth.jwksUrl)),
    issuer: config.neonAuth.issuer,
  });
  const errorReporter = config.sentry ? createErrorReporter(config.sentry) : undefined;

  return {
    async fetch(request, background) {
      const handle = openDb();
      const app = createApp({
        db: handle.db,
        ai: unavailableAiProvider,
        auth,
        corsOrigins: config.corsOrigins,
        // One allowlisted JSON line per request goes to stdout (see `request-log.ts`).
        log: (line) => console.log(line),
        ...(errorReporter ? { errorReporter } : {}),
      });
      try {
        return await app.fetch(request);
      } finally {
        // A failed close must not change the response; the next request opens its own handle.
        const closed = handle.close().catch(() => {});
        if (background) background.waitUntil(closed);
        else await closed;
      }
    },
  };
}
