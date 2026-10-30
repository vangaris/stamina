import { describe, expect, it } from 'vitest';
import { createServices } from './create-services.ts';

describe('createServices', () => {
  it('returns an in-memory healthy API in the test env', async () => {
    expect(await createServices('test').api.health()).toEqual({ status: 'ok', database: 'up' });
  });

  it('points the real API client at the configured base URL and fetch', async () => {
    const requested: string[] = [];
    const fetchStub = (async (input: URL | RequestInfo) => {
      requested.push(String(input));
      return Response.json({ status: 'degraded', database: 'down' }, { status: 503 });
    }) as typeof fetch;
    const { api } = createServices({ apiBaseUrl: 'https://api.example', fetch: fetchStub });

    expect(await api.health()).toEqual({ status: 'degraded', database: 'down' });
    expect(requested).toEqual(['https://api.example/health']);
  });
});
