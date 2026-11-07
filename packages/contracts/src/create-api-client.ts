import {
  acceptAdaptationResultSchema,
  adaptationListSchema,
  declineAdaptationResultSchema,
} from './adaptation-schema.ts';
import { AdaptationSubpath } from './enums/adaptation-subpath.ts';
import { adaptationPath } from './utils/adaptation-path.ts';
import { ApiError } from './api-error.ts';
import { logActivityResultSchema, weekLoadSchema } from './activity-schema.ts';
import { latestCheckinResponseSchema, submitCheckinResultSchema } from './checkin-schema.ts';
import { CheckinSubpath } from './enums/checkin-subpath.ts';
import { StopFlagSubpath } from './enums/stop-flag-subpath.ts';
import { confirmDoctorSeenResultSchema, reportStopFlagResultSchema } from './stop-flag-schema.ts';
import { checkinPath } from './utils/checkin-path.ts';
import { stopFlagPath } from './utils/stop-flag-path.ts';
import { ActivitySubpath } from './enums/activity-subpath.ts';
import { activityPath } from './utils/activity-path.ts';
import { ApiPath } from './enums/api-path.ts';
import { NutritionSubpath } from './enums/nutrition-subpath.ts';
import { HttpHeaderName } from './enums/http-header-name.ts';
import { HttpMethod } from './enums/http-method.ts';
import { HttpStatus } from './enums/http-status.ts';
import { createProgramResultSchema } from './create-program-result-schema.ts';
import { consentStateSchema } from './consent-schema.ts';
import { getProfileResponseSchema } from './get-profile-response-schema.ts';
import { healthResponseSchema } from './health-response-schema.ts';
import { inviteCheckResponseSchema } from './invite-check-schema.ts';
import { meResponseSchema } from './me-response-schema.ts';
import { programResponseSchema } from './program-schema.ts';
import {
  finishSessionResultSchema,
  logSetResultSchema,
  sessionResponseSchema,
} from './session-schema.ts';
import { sessionPath } from './utils/session-path.ts';
import { SessionSubpath } from './enums/session-subpath.ts';
import { recordDoctorOkResultSchema } from './record-doctor-ok-result-schema.ts';
import { safetyStateSchema } from './safety-state-schema.ts';
import { saveProfileResultSchema } from './save-profile-result-schema.ts';
import { saveScreeningResultSchema } from './save-screening-result-schema.ts';
import type { ApiClient, ApiClientOptions } from './types.ts';
import { progressSchema } from './progress-schema.ts';
import { logWeighInResultSchema } from './weigh-in-schema.ts';
import { nutritionStateSchema, saveNutritionSetupResultSchema } from './nutrition-schema.ts';
import { logMealResultSchema } from './meal-log-schema.ts';
import { logWaterResultSchema } from './water-schema.ts';
import { nutritionPath } from './utils/nutrition-path.ts';
import { userExportSchema } from './user-export-schema.ts';

const BEARER_SCHEME = 'Bearer';
const JSON_CONTENT_TYPE = 'application/json';

export function createApiClient({
  baseUrl,
  fetch: fetchImpl = fetch,
  getToken,
}: ApiClientOptions): ApiClient {
  const url = (path: string) => new URL(path, baseUrl).toString();

  async function send(path: string, init: RequestInit, acceptedStatuses: number[] = []) {
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

  const postJson = (path: string, body: unknown, acceptedStatuses?: number[]) =>
    send(path, { method: HttpMethod.Post, body: JSON.stringify(body) }, acceptedStatuses);

  const putJson = (path: string, body: unknown, acceptedStatuses?: number[]) =>
    send(path, { method: HttpMethod.Put, body: JSON.stringify(body) }, acceptedStatuses);

  const postEmpty = (path: string, acceptedStatuses?: number[]) =>
    send(path, { method: HttpMethod.Post }, acceptedStatuses);

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
    async getSafety() {
      const response = await send(ApiPath.Safety, {});
      return safetyStateSchema.parse(await response.json());
    },
    async grantConsent(grant) {
      const response = await postJson(ApiPath.Consent, grant);
      return consentStateSchema.parse(await response.json());
    },
    async saveScreening(submission) {
      const response = await postJson(ApiPath.Screening, submission, [
        HttpStatus.UnprocessableEntity,
      ]);
      return saveScreeningResultSchema.parse(await response.json());
    },
    async recheckScreening(recheck) {
      const response = await postJson(ApiPath.ScreeningRecheck, recheck, [
        HttpStatus.UnprocessableEntity,
      ]);
      return saveScreeningResultSchema.parse(await response.json());
    },
    async submitCheckin(checkin) {
      const response = await postJson(checkinPath(), checkin);
      return submitCheckinResultSchema.parse(await response.json());
    },
    async getLatestCheckin() {
      const response = await send(checkinPath(CheckinSubpath.Latest), {});
      return latestCheckinResponseSchema.parse(await response.json()).checkin;
    },
    async reportStopFlag(flag) {
      const response = await postJson(stopFlagPath(), flag);
      return reportStopFlagResultSchema.parse(await response.json());
    },
    async confirmDoctorSeen(confirm) {
      const response = await postJson(stopFlagPath(StopFlagSubpath.Confirm), confirm);
      return confirmDoctorSeenResultSchema.parse(await response.json());
    },
    async recordDoctorOk() {
      const response = await postEmpty(ApiPath.DoctorOk, [HttpStatus.UnprocessableEntity]);
      return recordDoctorOkResultSchema.parse(await response.json());
    },
    async getProgram() {
      const response = await send(ApiPath.Program, {});
      return programResponseSchema.parse(await response.json()).program;
    },
    async createProgram() {
      const response = await postEmpty(ApiPath.Program, [HttpStatus.UnprocessableEntity]);
      return createProgramResultSchema.parse(await response.json());
    },
    async getSession(sessionId) {
      const response = await send(sessionPath(sessionId), {});
      return sessionResponseSchema.parse(await response.json()).session;
    },
    async logSet(sessionId, set) {
      const response = await postJson(sessionPath(sessionId, SessionSubpath.Sets), set, [
        HttpStatus.UnprocessableEntity,
      ]);
      return logSetResultSchema.parse(await response.json());
    },
    async finishSession(sessionId, finish) {
      const response = await postJson(sessionPath(sessionId, SessionSubpath.Finish), finish);
      return finishSessionResultSchema.parse(await response.json());
    },
    async logActivity(activity) {
      const response = await postJson(activityPath(), activity, [HttpStatus.UnprocessableEntity]);
      return logActivityResultSchema.parse(await response.json());
    },
    async getWeekLoad() {
      const response = await send(activityPath(ActivitySubpath.Week), {});
      return weekLoadSchema.parse(await response.json());
    },
    async getProgress() {
      const response = await send(ApiPath.Progress, {});
      return progressSchema.parse(await response.json());
    },
    async logWeighIn(weighIn) {
      const response = await postJson(ApiPath.WeighIns, weighIn);
      return logWeighInResultSchema.parse(await response.json());
    },
    async getNutrition(date) {
      const response = await send(`${nutritionPath()}?${new URLSearchParams({ date })}`, {});
      return nutritionStateSchema.parse(await response.json());
    },
    async saveNutritionSetup(setup) {
      const response = await putJson(nutritionPath(NutritionSubpath.Setup), setup, [
        HttpStatus.UnprocessableEntity,
      ]);
      return saveNutritionSetupResultSchema.parse(await response.json());
    },
    async logWater(water) {
      const response = await postJson(ApiPath.Water, water);
      return logWaterResultSchema.parse(await response.json());
    },
    async logMeal(meal) {
      const response = await postJson(ApiPath.MealLogs, meal);
      return logMealResultSchema.parse(await response.json());
    },
    async getAdaptations() {
      const response = await send(adaptationPath(), {});
      return adaptationListSchema.parse(await response.json());
    },
    async acceptAdaptation(adaptationId, accept) {
      const response = await postJson(
        adaptationPath(adaptationId, AdaptationSubpath.Accept),
        accept,
        [HttpStatus.UnprocessableEntity],
      );
      return acceptAdaptationResultSchema.parse(await response.json());
    },
    async declineAdaptation(adaptationId) {
      const response = await postEmpty(adaptationPath(adaptationId, AdaptationSubpath.Decline), [
        HttpStatus.UnprocessableEntity,
      ]);
      return declineAdaptationResultSchema.parse(await response.json());
    },
    async exportData() {
      const response = await send(ApiPath.MeExport, {});
      return userExportSchema.parse(await response.json());
    },
    async deleteAccount() {
      await send(ApiPath.Me, { method: HttpMethod.Delete });
    },
  };
}
