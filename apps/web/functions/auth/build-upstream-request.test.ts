import { describe, expect, it } from 'vitest';
import { buildUpstreamRequest } from './build-upstream-request.ts';

const BASE = 'https://ep-x.neonauth.eu.aws.neon.tech/neondb/auth';

describe('buildUpstreamRequest', () => {
  it('maps /auth/<rest>?<query> to the same path under the auth base URL', async () => {
    const upstream = await buildUpstreamRequest(
      new Request('https://app.test/auth/email-otp/send-verification-otp?x=1'),
      BASE,
    );
    expect(upstream?.url).toBe(`${BASE}/email-otp/send-verification-otp?x=1`);
  });

  it('tolerates a trailing slash on the base URL', async () => {
    const upstream = await buildUpstreamRequest(
      new Request('https://app.test/auth/token'),
      `${BASE}/`,
    );
    expect(upstream?.url).toBe(`${BASE}/token`);
  });

  it('forwards the method, body and the four headers, and nothing else', async () => {
    const upstream = await buildUpstreamRequest(
      new Request('https://app.test/auth/sign-in/email-otp', {
        method: 'POST',
        body: '{"email":"a@b.c","otp":"424242"}',
        headers: {
          cookie: 'session=abc',
          'content-type': 'application/json',
          origin: 'https://app.test',
          accept: 'application/json',
          authorization: 'Bearer secret',
          'x-forwarded-for': '1.2.3.4',
        },
      }),
      BASE,
    );

    expect(upstream?.method).toBe('POST');
    expect(await upstream?.text()).toBe('{"email":"a@b.c","otp":"424242"}');
    expect([...upstream!.headers.keys()].sort()).toEqual([
      'accept',
      'content-type',
      'cookie',
      'origin',
    ]);
    expect(upstream?.headers.get('cookie')).toBe('session=abc');
  });

  it('does not send a body with a GET', async () => {
    const upstream = await buildUpstreamRequest(new Request('https://app.test/auth/token'), BASE);
    expect(upstream?.body).toBeNull();
  });

  it('refuses paths outside /auth/, so the proxy cannot reach anything else', async () => {
    for (const path of ['/auth', '/authors/x', '/today', '/api/auth/token', '/auth/../today']) {
      expect(
        await buildUpstreamRequest(new Request(`https://app.test${path}`), BASE),
      ).toBeUndefined();
    }
  });

  it('cannot be steered above the auth base path with dot segments', async () => {
    const upstream = await buildUpstreamRequest(
      new Request('https://app.test/auth/%2e%2e/%2e%2e/admin'),
      BASE,
    );
    expect(upstream === undefined || upstream.url.startsWith(`${BASE}/`)).toBe(true);
  });
});
