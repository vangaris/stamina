import { ApiError } from './api-error.ts';
import { healthResponseSchema } from './health-response-schema.ts';
import { meResponseSchema } from './me-response-schema.ts';
import type { ApiClient, ApiClientOptions } from './types.ts';

const BEARER_SCHEME = 'Bearer';

export function createApiClient({
  baseUrl,
  fetch: fetchImpl = fetch,
  getToken,
}: ApiClientOptions): ApiClient {
  const url = (path: string) => new URL(path, baseUrl).toString();

  async function authorized(path: string): Promise<Response> {
    const token = await getToken?.();
    const headers = new Headers();
    if (token) headers.set('Authorization', `${BEARER_SCHEME} ${token}`);
    const response = await fetchImpl(url(path), { headers });
    if (!response.ok) throw new ApiError(response.status);
    return response;
  }

  return {
    async health() {
      // 503 carries a valid `degraded` body, so the status code is not an error here.
      const response = await fetchImpl(url('/health'));
      return healthResponseSchema.parse(await response.json());
    },
    async me() {
      const response = await authorized('/me');
      return meResponseSchema.parse(await response.json());
    },
  };
}
