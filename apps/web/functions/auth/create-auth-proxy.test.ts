import { describe, expect, it } from 'vitest';
import { createAuthProxy } from './create-auth-proxy.ts';

const BASE = 'https://ep-x.neonauth.eu.aws.neon.tech/neondb/auth';

describe('createAuthProxy', () => {
  it('relays the upstream answer, set-cookie included, and forbids caching', async () => {
    const seen: Request[] = [];
    const proxy = createAuthProxy({
      authBaseUrl: BASE,
      fetch: async (input) => {
        seen.push(input as Request);
        return new Response('{"token":"t"}', {
          status: 200,
          headers: {
            'set-cookie': 'session=abc; HttpOnly; Path=/',
            'content-type': 'application/json',
          },
        });
      },
    });

    const response = await proxy(
      new Request('https://app.test/auth/token', { headers: { cookie: 'session=abc' } }),
    );

    expect(seen[0]?.url).toBe(`${BASE}/token`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ token: 't' });
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('passes an upstream error status through', async () => {
    const proxy = createAuthProxy({
      authBaseUrl: BASE,
      fetch: async () => new Response('{"code":"INVALID_OTP"}', { status: 400 }),
    });
    const response = await proxy(
      new Request('https://app.test/auth/sign-in/email-otp', { method: 'POST', body: '{}' }),
    );
    expect(response.status).toBe(400);
  });

  it('answers 404 for a path that is not under /auth/, without calling upstream', async () => {
    const proxy = createAuthProxy({
      authBaseUrl: BASE,
      fetch: async () => {
        throw new Error('must not be called');
      },
    });
    expect((await proxy(new Request('https://app.test/today'))).status).toBe(404);
  });

  it('answers 502 when the auth server cannot be reached', async () => {
    const proxy = createAuthProxy({
      authBaseUrl: BASE,
      fetch: async () => {
        throw new TypeError('network');
      },
    });
    expect((await proxy(new Request('https://app.test/auth/token'))).status).toBe(502);
  });
});
