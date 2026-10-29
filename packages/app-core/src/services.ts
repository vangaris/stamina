import { createApiClient, type ApiClient } from '@stamina/contracts';

export interface Services {
  api: ApiClient;
}

/** `'test'` gives in-memory mocks; otherwise real services pointed at the API. */
export type ServicesEnv = 'test' | { apiBaseUrl: string; fetch?: typeof fetch };

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
