import { healthResponseSchema, type HealthResponse } from './health.ts';

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
}

/** Typed client: every response is validated at runtime before it reaches a caller. */
export interface ApiClient {
  health(): Promise<HealthResponse>;
}

export function createApiClient({
  baseUrl,
  fetch: fetchImpl = fetch,
}: ApiClientOptions): ApiClient {
  const url = (path: string) => new URL(path, baseUrl).toString();
  return {
    async health() {
      // 503 carries a valid `degraded` body, so the status code is not an error here.
      const response = await fetchImpl(url('/health'));
      return healthResponseSchema.parse(await response.json());
    },
  };
}
