import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error.ts';
import { createApiClient } from './create-api-client.ts';
import { DatabaseStatus } from './enums/database-status.ts';
import { HealthStatus } from './enums/health-status.ts';

const USER_ID = '0192f3a4-5b6c-7d8e-9f01-23456789abcd';

function stubFetch(body: unknown, status = 200) {
  const requested: string[] = [];
  const authorizations: (string | null)[] = [];
  const fetchStub = (async (input: URL | RequestInfo, init?: RequestInit) => {
    requested.push(String(input));
    authorizations.push(new Headers(init?.headers).get('Authorization'));
    return Response.json(body, { status });
  }) as typeof fetch;
  return { fetchStub, requested, authorizations };
}

describe('createApiClient', () => {
  it('requests /health on the base URL and returns the parsed body', async () => {
    const { fetchStub, requested } = stubFetch({
      status: HealthStatus.Ok,
      database: DatabaseStatus.Up,
    });
    const client = createApiClient({ baseUrl: 'https://api.example/v1/', fetch: fetchStub });

    expect(await client.health()).toEqual({ status: HealthStatus.Ok, database: DatabaseStatus.Up });
    expect(requested).toEqual(['https://api.example/health']);
  });

  it('treats a 503 with a degraded body as a result, not an error', async () => {
    const { fetchStub } = stubFetch(
      { status: HealthStatus.Degraded, database: DatabaseStatus.Down },
      503,
    );
    const client = createApiClient({ baseUrl: 'https://api.example', fetch: fetchStub });

    expect(await client.health()).toEqual({
      status: HealthStatus.Degraded,
      database: DatabaseStatus.Down,
    });
  });

  it('rejects a response that does not match the contract', async () => {
    const { fetchStub } = stubFetch({ status: 'fine', database: DatabaseStatus.Up });
    const client = createApiClient({ baseUrl: 'https://api.example', fetch: fetchStub });

    await expect(client.health()).rejects.toThrow();
  });

  describe('me', () => {
    it('sends the token from getToken as a bearer header and returns the user id', async () => {
      const { fetchStub, requested, authorizations } = stubFetch({ userId: USER_ID });
      const client = createApiClient({
        baseUrl: 'https://api.example',
        fetch: fetchStub,
        getToken: async () => 'jwt-1',
      });

      expect(await client.me()).toEqual({ userId: USER_ID });
      expect(requested).toEqual(['https://api.example/me']);
      expect(authorizations).toEqual(['Bearer jwt-1']);
    });

    it('asks for a fresh token on every call', async () => {
      const { fetchStub, authorizations } = stubFetch({ userId: USER_ID });
      let calls = 0;
      const client = createApiClient({
        baseUrl: 'https://api.example',
        fetch: fetchStub,
        getToken: async () => `jwt-${++calls}`,
      });

      await client.me();
      await client.me();

      expect(authorizations).toEqual(['Bearer jwt-1', 'Bearer jwt-2']);
    });

    it('sends no Authorization header when there is no token', async () => {
      const { fetchStub, authorizations } = stubFetch({ userId: USER_ID });
      const client = createApiClient({
        baseUrl: 'https://api.example',
        fetch: fetchStub,
        getToken: async () => undefined,
      });

      await client.me();

      expect(authorizations).toEqual([null]);
    });

    it('throws an ApiError carrying the status on a 401', async () => {
      const { fetchStub } = stubFetch({ error: 'unauthorized' }, 401);
      const client = createApiClient({ baseUrl: 'https://api.example', fetch: fetchStub });

      const error = await client.me().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 401 });
    });

    it('rejects a body that does not match the contract', async () => {
      const { fetchStub } = stubFetch({ userId: 42 });
      const client = createApiClient({ baseUrl: 'https://api.example', fetch: fetchStub });

      await expect(client.me()).rejects.toThrow();
    });
  });
});
