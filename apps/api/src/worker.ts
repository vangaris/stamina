import { ZodError } from 'zod';
import { composeApi, type Api, type BackgroundTasks } from './compose.ts';
import { configErrorResponse } from './config-error-response.ts';
import { loadConfig } from './config.ts';
import { createNeonDb } from './db/neon-client.ts';

/**
 * Cloudflare Workers bindings (see `wrangler.jsonc` and `docs/infra.md`). Secrets and vars all
 * arrive as strings; `loadConfig` validates them.
 */
export interface WorkerEnv {
  /** Secret. */
  DATABASE_URL?: string;
  /** Secret, optional. */
  SENTRY_DSN?: string;
  NEON_AUTH_BASE_URL?: string;
  CORS_ORIGINS?: string;
  SENTRY_ENVIRONMENT?: string;
}

/** Bindings are fixed for the life of an isolate, so everything not per-request is built once. */
let api: Api | undefined;

function apiFor(env: WorkerEnv): Api {
  if (!api) {
    const config = loadConfig({ ...env });
    api = composeApi(config, () => createNeonDb(config.databaseUrl));
  }
  return api;
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: BackgroundTasks): Promise<Response> {
    let ready: Api;
    try {
      ready = apiFor(env);
    } catch (error) {
      if (error instanceof ZodError) return configErrorResponse(error);
      throw error;
    }
    return ready.fetch(request, ctx);
  },
};
