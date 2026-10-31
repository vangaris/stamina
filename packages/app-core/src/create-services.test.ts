import { describe, expect, it } from 'vitest';
import { DatabaseStatus, HealthStatus } from '@stamina/contracts';
import { createServices } from './create-services.ts';
import { ServicesMode } from './enums/services-mode.ts';

describe('createServices', () => {
  it('returns an in-memory healthy API in the test env', async () => {
    expect(await createServices({ mode: ServicesMode.Test }).api.health()).toEqual({
      status: HealthStatus.Ok,
      database: DatabaseStatus.Up,
    });
  });

  it('points the real API client at the configured base URL and fetch', async () => {
    const requested: string[] = [];
    const fetchStub = (async (input: URL | RequestInfo) => {
      requested.push(String(input));
      return Response.json(
        { status: HealthStatus.Degraded, database: DatabaseStatus.Down },
        { status: 503 },
      );
    }) as typeof fetch;
    const { api } = createServices({
      mode: ServicesMode.Production,
      apiBaseUrl: 'https://api.example',
      authUrl: '/auth',
      fetch: fetchStub,
    });

    expect(await api.health()).toEqual({
      status: HealthStatus.Degraded,
      database: DatabaseStatus.Down,
    });
    expect(requested).toEqual(['https://api.example/health']);
  });

  it('signs in against the fakes in the dev env', async () => {
    const { auth, api } = createServices({ mode: ServicesMode.Dev });

    await auth.verifyEmailCode('ada@example.com', '424242');

    expect((await api.me()).userId).toBe((await auth.getSession())?.userId);
  });

  it('sends the real API the token the auth URL hands out', async () => {
    const requested: { url: string; authorization: string | null }[] = [];
    const fetchStub = (async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      requested.push({ url, authorization: new Headers(init?.headers).get('Authorization') });
      return url.endsWith('/auth/token')
        ? Response.json({ token: 'jwt-1' })
        : Response.json({ userId: '0192f3a4-5b6c-7d8e-9f01-23456789abcd' });
    }) as typeof fetch;
    const { api } = createServices({
      mode: ServicesMode.Production,
      apiBaseUrl: 'https://api.example',
      authUrl: '/auth',
      fetch: fetchStub,
    });

    await api.me();

    expect(requested).toEqual([
      { url: '/auth/token', authorization: null },
      { url: 'https://api.example/me', authorization: 'Bearer jwt-1' },
    ]);
  });
});
