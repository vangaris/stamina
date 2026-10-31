import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { inject } from 'vitest';
import { composeApi, type BackgroundTasks } from '../src/compose.ts';
import { loadConfig } from '../src/config.ts';
import { createPgDb } from '../src/db/pg-client.ts';
import { appUser } from '../src/db/schema.ts';
import type { Db, DbHandle, OpenDb } from '../src/db/types.ts';
import { HttpHeader } from '../src/enums/http-header.ts';
import { createTestAuth, TEST_ISSUER } from './support/test-auth.ts';

const JWKS_URL = `${TEST_ISSUER}/auth/.well-known/jwks.json`;
const EU_DSN = 'https://publickey@o1.ingest.de.sentry.io/1';
const SENTRY_HOST = 'o1.ingest.de.sentry.io';
const ALLOWED_ORIGIN = 'https://stamina-web.pages.dev';
const USER_ID = '8c1f6f0e-5b1e-4d6e-9d44-3f0a4b1d2c11';

const baseEnv = () => ({
  DATABASE_URL: 'postgres://unused/db',
  NEON_AUTH_BASE_URL: `${TEST_ISSUER}/auth`,
  CORS_ORIGINS: ALLOWED_ORIGIN,
});

/** A database whose every query fails, like an unreachable one. */
const brokenDb = new Proxy(
  {},
  {
    get: () => () => {
      throw new Error('database unreachable');
    },
  },
) as Db;

describe('composeApi', () => {
  const real = createPgDb(inject('databaseUrl'));
  let testAuth: Awaited<ReturnType<typeof createTestAuth>>;
  let jwksFetches = 0;
  let sentryEnvelopes = 0;
  const realFetch = globalThis.fetch;
  const logLines: string[] = [];

  beforeAll(async () => {
    testAuth = await createTestAuth();
    vi.stubGlobal('fetch', async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input);
      if (url.href === JWKS_URL) {
        jwksFetches += 1;
        return Response.json(testAuth.jwks);
      }
      if (url.hostname === SENTRY_HOST) {
        sentryEnvelopes += 1;
        return new Response('{}', { status: 200 });
      }
      return realFetch(input, init);
    });
    vi.spyOn(console, 'log').mockImplementation((line: string) => {
      logLines.push(line);
    });
  });
  afterEach(() => {
    jwksFetches = 0;
    sentryEnvelopes = 0;
    logLines.length = 0;
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await real.close();
  });

  /** Opens `db` per request and counts the handles opened and closed. */
  function countingOpenDb(db: Db = real.db) {
    const counts = { opened: 0, closed: 0 };
    const openDb: OpenDb = () => {
      counts.opened += 1;
      return {
        db,
        close: async () => {
          counts.closed += 1;
        },
      };
    };
    return { counts, openDb };
  }

  const get = (path: string, headers: Record<string, string> = {}) =>
    new Request(`http://api.test${path}`, { headers });
  const bearer = async (userId = USER_ID) => ({
    [HttpHeader.Authorization]: `Bearer ${await testAuth.signToken(userId)}`,
  });

  it('serves health and an authenticated /me with a verifier built from the config', async () => {
    const { openDb } = countingOpenDb();
    const api = composeApi(loadConfig(baseEnv()), openDb);

    expect((await api.fetch(get('/health'))).status).toBe(200);
    expect((await api.fetch(get('/me'))).status).toBe(401);
    const me = await api.fetch(get('/me', await bearer()));

    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({ userId: USER_ID });
    expect(await real.db.select().from(appUser).where(eq(appUser.id, USER_ID))).toHaveLength(1);
  });

  it('keeps one JWKS cache for every request it serves', async () => {
    const { openDb } = countingOpenDb();
    const api = composeApi(loadConfig(baseEnv()), openDb);

    for (let i = 0; i < 3; i += 1) await api.fetch(get('/me', await bearer()));

    expect(jwksFetches).toBe(1);
  });

  it('applies the CORS allowlist and writes one request log line per request', async () => {
    const { openDb } = countingOpenDb();
    const api = composeApi(loadConfig(baseEnv()), openDb);

    const allowed = await api.fetch(get('/health', { origin: ALLOWED_ORIGIN }));
    const denied = await api.fetch(get('/health', { origin: 'https://evil.example' }));

    expect(allowed.headers.get(HttpHeader.AccessControlAllowOrigin)).toBe(ALLOWED_ORIGIN);
    expect(denied.headers.get(HttpHeader.AccessControlAllowOrigin)).toBeNull();
    expect(logLines).toHaveLength(2);
    expect(JSON.parse(logLines[0]!)).toMatchObject({ route: '/health', status: 200 });
  });

  describe('database handle per request', () => {
    it('opens a handle for each request and closes it before returning when there is no background', async () => {
      const { counts, openDb } = countingOpenDb();
      const api = composeApi(loadConfig(baseEnv()), openDb);

      await api.fetch(get('/health'));
      expect(counts).toEqual({ opened: 1, closed: 1 });
      await api.fetch(get('/health'));

      expect(counts).toEqual({ opened: 2, closed: 2 });
    });

    it('hands the close to waitUntil so the response does not wait for it', async () => {
      let finishClose!: () => void;
      const closing = new Promise<void>((resolve) => (finishClose = resolve));
      let closeCalled = false;
      const handle: DbHandle = {
        db: real.db,
        close: () => {
          closeCalled = true;
          return closing;
        },
      };
      const background: BackgroundTasks & { pending: Promise<unknown>[] } = {
        pending: [],
        waitUntil(promise) {
          this.pending.push(promise);
        },
      };
      const api = composeApi(loadConfig(baseEnv()), () => handle);

      const response = await api.fetch(get('/health'), background);

      expect(response.status).toBe(200);
      expect(closeCalled).toBe(true);
      expect(background.pending).toHaveLength(1);
      finishClose();
      await expect(background.pending[0]).resolves.toBeUndefined();
    });

    it('closes the handle when the database fails, and a failing close leaves the response alone', async () => {
      const closeFailed = vi.fn(async () => {
        throw new Error('pool already ended');
      });
      const api = composeApi(loadConfig(baseEnv()), () => ({
        db: brokenDb,
        close: closeFailed,
      }));

      const response = await api.fetch(get('/health'));

      expect(response.status).toBe(503);
      expect(closeFailed).toHaveBeenCalledOnce();
    });
  });

  describe('error reporting', () => {
    const failingMe = async (env: Record<string, string>) => {
      const { openDb } = countingOpenDb(brokenDb);
      const api = composeApi(loadConfig({ ...baseEnv(), ...env }), openDb);
      return api.fetch(get('/me', await bearer()));
    };

    it('reports an unexpected error to Sentry when a DSN is configured', async () => {
      const response = await failingMe({ SENTRY_DSN: EU_DSN });

      expect(response.status).toBe(500);
      expect(sentryEnvelopes).toBe(1);
    });

    it('reports nothing without a DSN', async () => {
      const response = await failingMe({});

      expect(response.status).toBe(500);
      expect(sentryEnvelopes).toBe(0);
    });
  });
});
