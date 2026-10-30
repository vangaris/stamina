import { healthResponseSchema } from './health-response-schema.ts';
import type { ApiClient, ApiClientOptions } from './types.ts';

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
