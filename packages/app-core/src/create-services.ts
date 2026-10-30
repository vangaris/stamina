import { createApiClient } from '@stamina/contracts';
import type { Services, ServicesEnv } from './types.ts';

export function createServices(env: ServicesEnv): Services {
  if (env === 'test') {
    return { api: { health: async () => ({ status: 'ok', database: 'up' }) } };
  }
  return {
    api: createApiClient({
      baseUrl: env.apiBaseUrl,
      ...(env.fetch ? { fetch: env.fetch } : {}),
    }),
  };
}
