import { serve } from '@hono/node-server';
import type { AddressInfo } from 'node:net';
import { inject } from 'vitest';
import { createApp, type AppDeps } from '../../src/app.ts';
import { createFieldCipher } from '../../src/crypto/index.ts';
import { createPgDb } from '../../src/db/pg-client.ts';
import { createFakeAi } from './fake-ai.ts';
import { TEST_ENCRYPTION_KEY } from './test-encryption-key.ts';
import { createTestAuth } from './test-auth.ts';

export interface TestApiOptions {
  databaseUrl?: string;
  /** Replaces the verifier built from the test's local JWKS (for example one whose key source is down). */
  auth?: AppDeps['auth'];
  /** Replaces the cipher built from the fixed test key (for example one with another key). */
  cipher?: AppDeps['cipher'];
  corsOrigins?: string[];
  log?: AppDeps['log'];
  errorReporter?: AppDeps['errorReporter'];
  /** Replaces the system clock (a Program starts the day after it). */
  now?: AppDeps['now'];
}

/** Boots the real Hono app on a real port, backed by real Postgres and a fake AI provider. */
export async function startTestApi(options: TestApiOptions = {}) {
  const dbHandle = createPgDb(options.databaseUrl ?? inject('databaseUrl'));
  const ai = createFakeAi();
  const testAuth = await createTestAuth();
  const cipher = options.cipher ?? createFieldCipher(TEST_ENCRYPTION_KEY);
  const app = createApp({
    db: dbHandle.db,
    ai: ai.provider,
    auth: options.auth ?? testAuth.verifier,
    cipher,
    corsOrigins: options.corsOrigins ?? [],
    // Request log lines are noise in test output unless a test captures them.
    log: options.log ?? (() => {}),
    ...(options.errorReporter ? { errorReporter: options.errorReporter } : {}),
    ...(options.now ? { now: options.now } : {}),
  });

  const server = await new Promise<ReturnType<typeof serve>>((resolve) => {
    const s = serve({ fetch: app.fetch, port: 0, hostname: '127.0.0.1' }, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;

  return {
    /** The real Hono app, so a test can add a route (for example one that throws). */
    app,
    baseUrl: `http://127.0.0.1:${port}`,
    ai,
    /** The cipher the app uses, so a test can read an encrypted column. */
    cipher,
    /** The same database the app uses, connected as the migrating user (a superuser here, so RLS-exempt). */
    db: dbHandle.db,
    /** Signs a token the app accepts for `userId` (or a deliberately bad one, via options). */
    signToken: testAuth.signToken,
    async close() {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      await dbHandle.close();
    },
  };
}
