import { ApiError, DatabaseStatus, HealthStatus, type ApiClient } from '@stamina/contracts';
import { FAKE_AUTH, HTTP_UNAUTHORIZED } from '../config.ts';

/** In-memory stand-in for the API: healthy, and `me` answers from the fake auth token. */
export function createFakeApiClient(getToken: () => Promise<string | undefined>): ApiClient {
  return {
    health: async () => ({ status: HealthStatus.Ok, database: DatabaseStatus.Up }),
    me: async () => {
      const token = await getToken();
      if (!token?.startsWith(FAKE_AUTH.tokenPrefix)) throw new ApiError(HTTP_UNAUTHORIZED);
      return { userId: token.slice(FAKE_AUTH.tokenPrefix.length) };
    },
  };
}
