import { createApiClient, DatabaseStatus, HealthStatus } from '@stamina/contracts';
import { ServicesMode } from './enums/services-mode.ts';
import type { Services, ServicesEnv } from './types.ts';

export function createServices(env: ServicesEnv): Services {
  if (env === ServicesMode.Test) {
    return {
      api: {
        health: async () => ({ status: HealthStatus.Ok, database: DatabaseStatus.Up }),
      },
    };
  }
  return {
    api: createApiClient({
      baseUrl: env.apiBaseUrl,
      ...(env.fetch ? { fetch: env.fetch } : {}),
    }),
  };
}
