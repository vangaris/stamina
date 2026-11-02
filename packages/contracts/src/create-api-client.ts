import { ApiError } from './api-error.ts';
import { ApiPath } from './enums/api-path.ts';
import { HttpHeaderName } from './enums/http-header-name.ts';
import { HttpMethod } from './enums/http-method.ts';
import { HttpStatus } from './enums/http-status.ts';
import { getProfileResponseSchema } from './get-profile-response-schema.ts';
import { healthResponseSchema } from './health-response-schema.ts';
import { inviteCheckResponseSchema } from './invite-check-schema.ts';
import { meResponseSchema } from './me-response-schema.ts';
import { saveProfileResultSchema } from './save-profile-result-schema.ts';
import type { ApiClient, ApiClientOptions } from './types.ts';

const BEARER_SCHEME = 'Bearer';
const JSON_CONTENT_TYPE = 'application/json';

export function createApiClient({
  baseUrl,
  fetch: fetchImpl = fetch,
  getToken,
}: ApiClientOptions): ApiClient {
  const url = (path: string) => new URL(path, baseUrl).toString();

  async function send(path: ApiPath, init: RequestInit, acceptedStatuses: number[] = []) {
    const token = await getToken?.();
    const headers = new Headers();
    if (token) headers.set(HttpHeaderName.Authorization, `${BEARER_SCHEME} ${token}`);
    if (init.body !== undefined) headers.set(HttpHeaderName.ContentType, JSON_CONTENT_TYPE);
    const response = await fetchImpl(url(path), { method: HttpMethod.Get, ...init, headers });
    if (!response.ok && !acceptedStatuses.includes(response.status)) {
      throw new ApiError(response.status);
    }
    return response;
  }

  const postJson = (path: ApiPath, body: unknown, acceptedStatuses?: number[]) =>
    send(path, { method: HttpMethod.Post, body: JSON.stringify(body) }, acceptedStatuses);

  return {
    async health() {
      // 503 carries a valid `degraded` body, so the status code is not an error here.
      const response = await fetchImpl(url(ApiPath.Health));
      return healthResponseSchema.parse(await response.json());
    },
    async me() {
      const response = await send(ApiPath.Me, {});
      return meResponseSchema.parse(await response.json());
    },
    async checkInvite(code) {
      const response = await postJson(ApiPath.InviteCheck, { code });
      return inviteCheckResponseSchema.parse(await response.json());
    },
    async getProfile() {
      const response = await send(ApiPath.Profile, {});
      return getProfileResponseSchema.parse(await response.json()).profile;
    },
    async saveProfile(submission) {
      const response = await postJson(ApiPath.Profile, submission, [
        HttpStatus.UnprocessableEntity,
      ]);
      return saveProfileResultSchema.parse(await response.json());
    },
  };
}
