import type { z } from 'zod';
import type { createProgramResultSchema } from './create-program-result-schema.ts';
import type {
  programBlockSchema,
  programExerciseSchema,
  programResponseSchema,
  programSessionSchema,
  programWeekSchema,
} from './program-schema.ts';
import type {
  launchSportDataSchema,
  sportDraftSchema,
  sportProfileSchema,
  sportSourceSchema,
} from './sport-profile-schema.ts';
import type { catalogSportSchema, sportListResponseSchema } from './catalog-sport-schema.ts';
import type {
  exerciseImageSchema,
  exerciseListResponseSchema,
  exerciseQuerySchema,
  exerciseSchema,
} from './exercise-schema.ts';
import type { consentGrantSchema, consentStateSchema } from './consent-schema.ts';
import type { getProfileResponseSchema } from './get-profile-response-schema.ts';
import type { healthResponseSchema } from './health-response-schema.ts';
import type { inviteCheckResponseSchema } from './invite-check-schema.ts';
import type { meResponseSchema } from './me-response-schema.ts';
import type { profileAnswersSchema } from './profile-answers-schema.ts';
import type { profileSubmissionSchema } from './profile-submission-schema.ts';
import type { recordDoctorOkResultSchema } from './record-doctor-ok-result-schema.ts';
import type { safetyStateSchema } from './safety-state-schema.ts';
import type { saveProfileResultSchema } from './save-profile-result-schema.ts';
import type { saveScreeningResultSchema } from './save-screening-result-schema.ts';
import type { savedProfileSchema } from './saved-profile-schema.ts';
import type { savedScreeningSchema } from './saved-screening-schema.ts';
import type { screeningSubmissionSchema } from './screening-submission-schema.ts';
import type { userExportSchema } from './user-export-schema.ts';

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type ProfileAnswers = z.infer<typeof profileAnswersSchema>;
export type ProfileSubmission = z.infer<typeof profileSubmissionSchema>;
export type SavedProfile = z.infer<typeof savedProfileSchema>;
export type SaveProfileResult = z.infer<typeof saveProfileResultSchema>;
export type GetProfileResponse = z.infer<typeof getProfileResponseSchema>;
export type InviteCheckResponse = z.infer<typeof inviteCheckResponseSchema>;
export type ExerciseImage = z.infer<typeof exerciseImageSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseListResponse = z.infer<typeof exerciseListResponseSchema>;
export type ExerciseQuery = z.infer<typeof exerciseQuerySchema>;
export type SportProfile = z.infer<typeof sportProfileSchema>;
export type SportSource = z.infer<typeof sportSourceSchema>;
export type SportDraft = z.infer<typeof sportDraftSchema>;
export type LaunchSportData = z.infer<typeof launchSportDataSchema>;
export type CatalogSport = z.infer<typeof catalogSportSchema>;
export type SportListResponse = z.infer<typeof sportListResponseSchema>;
export type ConsentGrant = z.infer<typeof consentGrantSchema>;
export type ConsentState = z.infer<typeof consentStateSchema>;
export type ScreeningSubmission = z.infer<typeof screeningSubmissionSchema>;
export type SavedScreening = z.infer<typeof savedScreeningSchema>;
export type SafetyState = z.infer<typeof safetyStateSchema>;
export type SaveScreeningResult = z.infer<typeof saveScreeningResultSchema>;
export type RecordDoctorOkResult = z.infer<typeof recordDoctorOkResultSchema>;
export type UserExport = z.infer<typeof userExportSchema>;
export type ProgramExercise = z.infer<typeof programExerciseSchema>;
export type ProgramSession = z.infer<typeof programSessionSchema>;
export type ProgramBlock = z.infer<typeof programBlockSchema>;
export type ProgramWeek = z.infer<typeof programWeekSchema>;
export type ProgramResponse = z.infer<typeof programResponseSchema>;
export type CreateProgramResult = z.infer<typeof createProgramResultSchema>;

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
  /** Consents given at the current text version and the latest Screening. */
  getSafety(): Promise<SafetyState>;
  /** Records one consent (a new row; an already-granted purpose at this version is left as is). */
  grantConsent(grant: ConsentGrant): Promise<ConsentState>;
  /** Missing consent (`422`) is a `Rejected` result, not an error. */
  saveScreening(submission: ScreeningSubmission): Promise<SaveScreeningResult>;
  /** `422` (no referral, or pregnancy) is a `Rejected` result, not an error. */
  recordDoctorOk(): Promise<RecordDoctorOkResult>;
  /** The first week of the signed-in user's Program, or `null` before one is created. */
  getProgram(): Promise<ProgramWeek | null>;
  /** Creates the Program if there is none (a repeat returns the stored one); `422` is a `Rejected` result, not an error. */
  createProgram(): Promise<CreateProgramResult>;
  /** Everything Stamina holds about the signed-in user. */
  exportData(): Promise<UserExport>;
  /** Hard-deletes the signed-in user's rows. Resolves once they are gone. */
  deleteAccount(): Promise<void>;
}
