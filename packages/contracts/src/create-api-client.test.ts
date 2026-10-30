import { describe, expect, it } from 'vitest';
import { createApiClient } from './create-api-client.ts';
import { DatabaseStatus } from './enums/database-status.ts';
import { HealthStatus } from './enums/health-status.ts';

function stubFetch(body: unknown, status = 200) {
  const requested: string[] = [];
  const fetchStub = (async (input: URL | RequestInfo) => {
    requested.push(String(input));
    return Response.json(body, { status });
  }) as typeof fetch;
  return { fetchStub, requested };
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
});
