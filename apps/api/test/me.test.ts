import { createApiClient, meResponseSchema } from '@stamina/contracts';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTokenVerifier } from '../src/auth/index.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { HttpHeader } from '../src/enums/http-header.ts';
import { appUser } from '../src/db/schema.ts';
import { withUser } from '../src/db/with-user.ts';
import { queryRows } from './support/query-rows.ts';
import { generateEd25519KeyPair, TEST_ISSUER } from './support/test-auth.ts';
import { startTestApi } from './support/test-api.ts';

describe('GET /me', () => {
  let api: Awaited<ReturnType<typeof startTestApi>>;
  const lines: string[] = [];
  beforeAll(async () => {
    api = await startTestApi({ log: (line) => lines.push(line) });
  });
  afterAll(() => api.close());

  const me = (token?: string) =>
    fetch(`${api.baseUrl}/me`, {
      ...(token === undefined
        ? {}
        : { headers: { [HttpHeader.Authorization]: `Bearer ${token}` } }),
    });
  const rowsFor = (userId: string) => api.db.select().from(appUser).where(eq(appUser.id, userId));

  describe('rejects a request without a valid token', () => {
    const unauthorized = async (response: Response) => {
      expect(response.status).toBe(401);
      expect(response.headers.get(HttpHeader.WwwAuthenticate)).toBe('Bearer');
      expect(await response.json()).toEqual({ error: ApiErrorCode.Unauthorized });
    };

    it('without an Authorization header', async () => {
      await unauthorized(await me());
    });

    it('with another scheme or an empty token', async () => {
      for (const header of ['Basic dXNlcjpwYXNz', 'Bearer', 'Bearer ']) {
        await unauthorized(
          await fetch(`${api.baseUrl}/me`, { headers: { [HttpHeader.Authorization]: header } }),
        );
      }
    });

    it('with a garbage token', async () => {
      await unauthorized(await me('not-a-jwt'));
    });

    it('with an expired token', async () => {
      const expired = await api.signToken(crypto.randomUUID(), {
        expiresAt: Math.floor(Date.now() / 1000) - 60,
      });

      await unauthorized(await me(expired));
    });

    it('with another issuer', async () => {
      const token = await api.signToken(crypto.randomUUID(), {
        issuer: 'https://evil.example.com',
      });

      await unauthorized(await me(token));
    });

    it('signed by a key the API does not trust', async () => {
      const { privateKey } = await generateEd25519KeyPair();
      const token = await api.signToken(crypto.randomUUID(), { privateKey });

      await unauthorized(await me(token));
    });

    it('whose subject is missing or not a UUID', async () => {
      await unauthorized(await me(await api.signToken('x', { subject: null })));
      await unauthorized(await me(await api.signToken('x', { subject: 'user-1; drop table' })));
    });

    it('and creates no row', async () => {
      const userId = crypto.randomUUID();
      await me(await api.signToken(userId, { issuer: 'https://evil.example.com' }));

      expect(await rowsFor(userId)).toEqual([]);
    });
  });

  it('creates the user row on the first call and leaves it alone afterwards', async () => {
    const userId = crypto.randomUUID();
    const token = await api.signToken(userId);
    expect(await rowsFor(userId)).toEqual([]);

    const first = await me(token);
    const [created] = await rowsFor(userId);
    const second = await me(token);
    const again = await Promise.all([me(token), me(token), me(token)]);

    expect(first.status).toBe(200);
    expect(meResponseSchema.parse(await first.json())).toEqual({ userId });
    expect(second.status).toBe(200);
    expect(again.map((r) => r.status)).toEqual([200, 200, 200]);
    const rows = await rowsFor(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(created);
  });

  it('is readable through the typed client with a token getter', async () => {
    const userId = crypto.randomUUID();
    const client = createApiClient({
      baseUrl: api.baseUrl,
      getToken: () => api.signToken(userId),
    });

    expect(await client.me()).toEqual({ userId });
  });

  it('answers each user with their own ID', async () => {
    const [a, b] = [crypto.randomUUID(), crypto.randomUUID()];

    const forA = await (await me(await api.signToken(a))).json();
    const forB = await (await me(await api.signToken(b))).json();

    expect(forA).toEqual({ userId: a });
    expect(forB).toEqual({ userId: b });
  });

  it('logs the pseudonymous user ID and never the token', async () => {
    const userId = crypto.randomUUID();
    const token = await api.signToken(userId);
    lines.length = 0;

    await me(token);

    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(record).toMatchObject({ route: '/me', status: 200, user_id: userId });
    expect(lines[0]).not.toContain(token);
    expect(lines[0]).not.toContain(token.split('.')[1]!);
    expect(Object.keys(record).sort()).toEqual([
      'latency_ms',
      'request_id',
      'route',
      'status',
      'user_id',
    ]);
  });

  it('logs a rejected request without a user ID or the token', async () => {
    lines.length = 0;

    await me('not-a-jwt');

    const record = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(record).toMatchObject({ route: '/me', status: 401 });
    expect(record).not.toHaveProperty('user_id');
    expect(lines[0]).not.toContain('not-a-jwt');
  });

  it('answers 500, not 401, when the signing keys cannot be fetched', async () => {
    const down = await startTestApi({
      auth: createTokenVerifier({
        keys: () => Promise.reject(new TypeError('fetch failed')),
        issuer: TEST_ISSUER,
      }),
    });
    try {
      const token = await api.signToken(crypto.randomUUID());
      const response = await fetch(`${down.baseUrl}/me`, {
        headers: { [HttpHeader.Authorization]: `Bearer ${token}` },
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: ApiErrorCode.InternalError });
    } finally {
      await down.close();
    }
  });

  describe('row-level security (user B cannot read user A)', () => {
    const [userA, userB] = [crypto.randomUUID(), crypto.randomUUID()];
    beforeAll(async () => {
      await me(await api.signToken(userA));
      await me(await api.signToken(userB));
    });

    it("shows each user only their own row through withUser, never the other's", async () => {
      const asB = await withUser(api.db, userB, (tx) => tx.select().from(appUser));
      const asA = await withUser(api.db, userA, (tx) => tx.select().from(appUser));
      const aFromB = await withUser(api.db, userB, (tx) =>
        tx.select().from(appUser).where(eq(appUser.id, userA)),
      );

      expect(asB.map((row) => row.id)).toEqual([userB]);
      expect(asA.map((row) => row.id)).toEqual([userA]);
      expect(aFromB).toEqual([]);
    });

    it("rejects creating a row for another user's ID", async () => {
      const victim = crypto.randomUUID();

      await expect(
        withUser(api.db, userB, (tx) => tx.insert(appUser).values({ id: victim })),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      expect(await rowsFor(victim)).toEqual([]);
    });

    it("cannot change, delete or take over another user's row", async () => {
      const deleted = await withUser(api.db, userB, (tx) =>
        tx.delete(appUser).where(eq(appUser.id, userA)).returning(),
      );
      const updated = await withUser(api.db, userB, (tx) =>
        tx
          .update(appUser)
          .set({ createdAt: new Date(0) })
          .where(eq(appUser.id, userA))
          .returning(),
      );
      const reassign = withUser(api.db, userB, (tx) =>
        tx.update(appUser).set({ id: userA }).where(eq(appUser.id, userB)),
      );

      expect(deleted).toEqual([]);
      expect(updated).toEqual([]);
      await expect(reassign).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      expect(await rowsFor(userA)).toHaveLength(1);
      expect(await rowsFor(userB)).toHaveLength(1);
    });

    it('sees nothing when the user ID belongs to no row', async () => {
      const stranger = await withUser(api.db, crypto.randomUUID(), (tx) =>
        tx.select().from(appUser),
      );

      expect(stranger).toEqual([]);
    });

    it('runs as a role that cannot bypass RLS', async () => {
      const [role] = await queryRows(
        api.db,
        sql`select rolcanlogin, rolbypassrls, rolsuper from pg_roles where rolname = 'stamina_app'`,
      );

      expect(role).toEqual({ rolcanlogin: false, rolbypassrls: false, rolsuper: false });
    });

    it('does not leak the identity or role to the next use of the connection', async () => {
      await withUser(api.db, userA, (tx) => tx.select().from(appUser));

      const [after] = await queryRows(
        api.db,
        sql`select current_user as role, nullif(current_setting('app.user_id', true), '') as user_id`,
      );

      expect(after).toMatchObject({ user_id: null });
      expect(after).not.toMatchObject({ role: 'stamina_app' });
    });

    it('is why withUser exists: the connection user sees every row without it', async () => {
      const rows = await queryRows(
        api.db,
        sql`select rolsuper as superuser from pg_roles where rolname = current_user`,
      );
      const visible = await api.db.select().from(appUser);

      // Superusers (the local and CI Postgres user) and Neon's owner role bypass RLS.
      expect(rows).toEqual([{ superuser: true }]);
      expect(visible.map((row) => row.id)).toEqual(expect.arrayContaining([userA, userB]));
    });
  });
});

/** SQLSTATE 42501: a row failed the policy's WITH CHECK. */
const PG_INSUFFICIENT_PRIVILEGE = '42501';
