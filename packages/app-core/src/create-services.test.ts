import { describe, expect, it } from 'vitest';
import { DatabaseStatus, HealthStatus } from '@stamina/contracts';
import { createServices } from './create-services.ts';
import { ServicesMode } from './enums/services-mode.ts';

describe('createServices', () => {
  it('returns an in-memory healthy API in the test env', async () => {
    expect(await createServices(ServicesMode.Test).api.health()).toEqual({
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
    const { api } = createServices({ apiBaseUrl: 'https://api.example', fetch: fetchStub });

    expect(await api.health()).toEqual({
      status: HealthStatus.Degraded,
      database: DatabaseStatus.Down,
    });
    expect(requested).toEqual(['https://api.example/health']);
  });
});
