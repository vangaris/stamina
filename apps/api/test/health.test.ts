import { createApiClient } from '@stamina/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startTestApi } from './support/test-api.ts';

describe('GET /health', () => {
  let api: Awaited<ReturnType<typeof startTestApi>>;
  beforeAll(async () => {
    api = await startTestApi({ corsOrigins: ['https://*.stamina-web.pages.dev'] });
  });
  afterAll(() => api.close());

  it('reports ok when the database answers', async () => {
    const response = await fetch(`${api.baseUrl}/health`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok', database: 'up' });
  });

  it('is readable through the typed client', async () => {
    const client = createApiClient({ baseUrl: api.baseUrl });

    expect(await client.health()).toEqual({ status: 'ok', database: 'up' });
  });

  it('reports degraded with 503 when the database is unreachable', async () => {
    const broken = await startTestApi({ databaseUrl: 'postgres://nobody:x@127.0.0.1:1/none' });
    try {
      const response = await fetch(`${broken.baseUrl}/health`);

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ status: 'degraded', database: 'down' });
    } finally {
      await broken.close();
    }
  });

  it('lets a preview web origin read it but not a stranger', async () => {
    const allowed = await fetch(`${api.baseUrl}/health`, {
      headers: { origin: 'https://pr-7.stamina-web.pages.dev' },
    });
    const stranger = await fetch(`${api.baseUrl}/health`, {
      headers: { origin: 'https://evil.example.com' },
    });

    expect(allowed.headers.get('access-control-allow-origin')).toBe(
      'https://pr-7.stamina-web.pages.dev',
    );
    expect(stranger.headers.get('access-control-allow-origin')).toBeNull();
  });
});
