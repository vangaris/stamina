import { createRemoteJWKSet } from 'jose';
import { unavailableAiProvider } from './ai/provider.ts';
import { createApp } from './app.ts';
import { createTokenVerifier } from './auth/index.ts';
import { loadConfig } from './config.ts';
import { createDb } from './db/client.ts';
import { createErrorReporter } from './error-reporter.ts';

const config = loadConfig(process.env);
const { db } = createDb(config.databaseUrl);

const app = createApp({
  db,
  ai: unavailableAiProvider,
  auth: createTokenVerifier({
    keys: createRemoteJWKSet(new URL(config.neonAuth.jwksUrl)),
    issuer: config.neonAuth.issuer,
  }),
  corsOrigins: config.corsOrigins,
  // One allowlisted JSON line per request goes to stdout (see `request-log.ts`).
  log: (line) => console.log(line),
  ...(config.sentry ? { errorReporter: createErrorReporter(config.sentry) } : {}),
});

/** Deno Deploy (`deno serve`) and the Node dev entry both consume this. */
export default { fetch: app.fetch };
