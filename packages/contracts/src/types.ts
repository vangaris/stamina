import type { z } from 'zod';
import type { getProfileResponseSchema } from './get-profile-response-schema.ts';
import type { healthResponseSchema } from './health-response-schema.ts';
import type { inviteCheckResponseSchema } from './invite-check-schema.ts';
import type { meResponseSchema } from './me-response-schema.ts';
import type { profileAnswersSchema } from './profile-answers-schema.ts';
import type { profileSubmissionSchema } from './profile-submission-schema.ts';
import type { saveProfileResultSchema } from './save-profile-result-schema.ts';
import type { savedProfileSchema } from './saved-profile-schema.ts';

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type ProfileAnswers = z.infer<typeof profileAnswersSchema>;
export type ProfileSubmission = z.infer<typeof profileSubmissionSchema>;
export type SavedProfile = z.infer<typeof savedProfileSchema>;
export type SaveProfileResult = z.infer<typeof saveProfileResultSchema>;
export type GetProfileResponse = z.infer<typeof getProfileResponseSchema>;
export type InviteCheckResponse = z.infer<typeof inviteCheckResponseSchema>;

export interface ApiClientOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  /** Called before each authenticated request; a returned token is sent as `Authorization: Bearer`. */
  getToken?: () => Promise<string | undefined>;
}

/**
 * Typed client: every response is validated at runtime before it reaches a caller.
 * Authenticated calls throw `ApiError` on a non-2xx answer, except where a method says its
 * rejection is part of the result.
 */
export interface ApiClient {
  health(): Promise<HealthResponse>;
  me(): Promise<MeResponse>;
  /** No sign-in needed. */
  checkInvite(code: string): Promise<InviteCheckResponse>;
  /** The signed-in user's profile, or `null` before onboarding. */
  getProfile(): Promise<SavedProfile | null>;
  /** A turned-away applicant (`422`) is a `Rejected` result, not an error. */
  saveProfile(submission: ProfileSubmission): Promise<SaveProfileResult>;
}
