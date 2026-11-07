import type { z } from 'zod';
import type {
  checkinSchema,
  exportedCheckinSchema,
  latestCheckinResponseSchema,
  submitCheckinResultSchema,
  submitCheckinSchema,
} from './checkin-schema.ts';
import type { recheckScreeningSchema } from './recheck-screening-schema.ts';
import type {
  confirmDoctorSeenResultSchema,
  confirmDoctorSeenSchema,
  exportedStopFlagSchema,
  reportStopFlagResultSchema,
  reportStopFlagSchema,
  stopStateSchema,
} from './stop-flag-schema.ts';
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
import type {
  exportedActivitySchema,
  loggedActivitySchema,
  logActivityResultSchema,
  logActivitySchema,
  plannedActivitySchema,
  weekLoadSchema,
  weeklyLoadSchema,
} from './activity-schema.ts';
import type {
  acceptAdaptationResultSchema,
  acceptAdaptationSchema,
  adaptationChangeSchema,
  adaptationListSchema,
  adaptationSchema,
  declineAdaptationResultSchema,
  exportedAdaptationSchema,
  sessionRevisionRefSchema,
} from './adaptation-schema.ts';
import type { userExportSchema } from './user-export-schema.ts';
import type {
  progressSchema,
  progressVerdictSchema,
  progressWeekSchema,
} from './progress-schema.ts';
import type {
  exportedWeighInSchema,
  logWeighInResultSchema,
  logWeighInSchema,
} from './weigh-in-schema.ts';
import type {
  exerciseVariantSchema,
  finishedSessionSchema,
  finishSessionResultSchema,
  finishSessionSchema,
  loggedSetSchema,
  logSetResultSchema,
  logSetSchema,
  sessionDetailSchema,
  sessionExerciseSchema,
  sessionResponseSchema,
} from './session-schema.ts';

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
export type RecheckScreening = z.infer<typeof recheckScreeningSchema>;
export type SubmitCheckin = z.infer<typeof submitCheckinSchema>;
export type Checkin = z.infer<typeof checkinSchema>;
export type SubmitCheckinResult = z.infer<typeof submitCheckinResultSchema>;
export type LatestCheckinResponse = z.infer<typeof latestCheckinResponseSchema>;
export type ExportedCheckin = z.infer<typeof exportedCheckinSchema>;
export type ReportStopFlag = z.infer<typeof reportStopFlagSchema>;
export type StopStateResponse = z.infer<typeof stopStateSchema>;
export type ReportStopFlagResult = z.infer<typeof reportStopFlagResultSchema>;
export type ConfirmDoctorSeen = z.infer<typeof confirmDoctorSeenSchema>;
export type ConfirmDoctorSeenResult = z.infer<typeof confirmDoctorSeenResultSchema>;
export type ExportedStopFlag = z.infer<typeof exportedStopFlagSchema>;
export type RecordDoctorOkResult = z.infer<typeof recordDoctorOkResultSchema>;
export type UserExport = z.infer<typeof userExportSchema>;
export type ProgramExercise = z.infer<typeof programExerciseSchema>;
export type ProgramSession = z.infer<typeof programSessionSchema>;
export type ProgramBlock = z.infer<typeof programBlockSchema>;
export type ProgramWeek = z.infer<typeof programWeekSchema>;
export type ProgramResponse = z.infer<typeof programResponseSchema>;
export type CreateProgramResult = z.infer<typeof createProgramResultSchema>;
export type LogSet = z.infer<typeof logSetSchema>;
export type LoggedSet = z.infer<typeof loggedSetSchema>;
export type FinishSession = z.infer<typeof finishSessionSchema>;
export type FinishedSession = z.infer<typeof finishedSessionSchema>;
export type ExerciseVariant = z.infer<typeof exerciseVariantSchema>;
export type SessionExercise = z.infer<typeof sessionExerciseSchema>;
export type SessionDetail = z.infer<typeof sessionDetailSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
export type LogSetResult = z.infer<typeof logSetResultSchema>;
export type FinishSessionResult = z.infer<typeof finishSessionResultSchema>;
export type LogActivity = z.infer<typeof logActivitySchema>;
export type LoggedActivity = z.infer<typeof loggedActivitySchema>;
export type ExportedActivity = z.infer<typeof exportedActivitySchema>;
export type LogActivityResult = z.infer<typeof logActivityResultSchema>;
export type PlannedActivity = z.infer<typeof plannedActivitySchema>;
export type WeeklyLoad = z.infer<typeof weeklyLoadSchema>;
export type WeekLoad = z.infer<typeof weekLoadSchema>;
export type ProgressWeek = z.infer<typeof progressWeekSchema>;
export type ProgressVerdict = z.infer<typeof progressVerdictSchema>;
export type Progress = z.infer<typeof progressSchema>;
export type LogWeighIn = z.infer<typeof logWeighInSchema>;
export type LogWeighInResult = z.infer<typeof logWeighInResultSchema>;
export type ExportedWeighIn = z.infer<typeof exportedWeighInSchema>;
export type SessionRevisionRef = z.infer<typeof sessionRevisionRefSchema>;
export type AdaptationChange = z.infer<typeof adaptationChangeSchema>;
export type Adaptation = z.infer<typeof adaptationSchema>;
export type AdaptationList = z.infer<typeof adaptationListSchema>;
export type AcceptAdaptation = z.infer<typeof acceptAdaptationSchema>;
export type AcceptAdaptationResult = z.infer<typeof acceptAdaptationResultSchema>;
export type DeclineAdaptationResult = z.infer<typeof declineAdaptationResultSchema>;
export type ExportedAdaptation = z.infer<typeof exportedAdaptationSchema>;

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
  /** Answers the asked-again questions; the rest carries over. No earlier Screening (`422`) is a `Rejected` result, not an error. */
  recheckScreening(recheck: RecheckScreening): Promise<SaveScreeningResult>;
  /** A repeat of a Check-in id the server has is ignored (`recorded` false). */
  submitCheckin(checkin: SubmitCheckin): Promise<SubmitCheckinResult>;
  /** The latest Check-in, or `null` before the first. */
  getLatestCheckin(): Promise<Checkin | null>;
  /** A repeat of a stop flag id the server has is ignored (`recorded` false). */
  reportStopFlag(flag: ReportStopFlag): Promise<ReportStopFlagResult>;
  /** "A doctor has seen me": ends the open pauses of the kinds the person saw; others stay. */
  confirmDoctorSeen(confirm: ConfirmDoctorSeen): Promise<ConfirmDoctorSeenResult>;
  /** `422` (no referral, or pregnancy) is a `Rejected` result, not an error. */
  recordDoctorOk(): Promise<RecordDoctorOkResult>;
  /** The first week of the signed-in user's Program, or `null` before one is created. */
  getProgram(): Promise<ProgramWeek | null>;
  /** Creates the Program if there is none (a repeat returns the stored one); `422` is a `Rejected` result, not an error. */
  createProgram(): Promise<CreateProgramResult>;
  /** One Session with what is logged so far; `ApiError` 404 when it is not the signed-in user's. */
  getSession(sessionId: string): Promise<SessionDetail>;
  /** A repeat of a set id the server has is ignored (`recorded` false); `422` is a `Rejected` result, not an error. */
  logSet(sessionId: string, set: LogSet): Promise<LogSetResult>;
  /** A second finish is ignored and returns the stored one (`recorded` false). */
  finishSession(sessionId: string, finish: FinishSession): Promise<FinishSessionResult>;
  /** A repeat of an Activity id the server has is ignored (`recorded` false); `422` is a `Rejected` result, not an error. */
  logActivity(activity: LogActivity): Promise<LogActivityResult>;
  /** The week that holds today: its Load, the average of the weeks before, and its Activities. */
  getWeekLoad(): Promise<WeekLoad>;
  /** The week that holds today against the person's usual: Sessions, Activities, the Load bars, the verdict and whether a weigh-in is due. */
  getProgress(): Promise<Progress>;
  /** Stores one weigh-in (kilograms). A weight outside the accepted range or a day too far ahead or too far back is an `ApiError` 400. */
  logWeighIn(weighIn: LogWeighIn): Promise<LogWeighInResult>;
  /** The pending Adaptation suggestions that still apply, oldest first. The server evaluates the rules first. */
  getAdaptations(): Promise<AdaptationList>;
  /**
   * Accepts a suggestion: the Program changes (new Session revisions). A repeat of an accept the
   * server has is ignored (`recorded` false); `422` (stale, or declined) is a `Rejected` result, not an error.
   */
  acceptAdaptation(adaptationId: string, accept: AcceptAdaptation): Promise<AcceptAdaptationResult>;
  /** Declines a suggestion ("Keep my plan"); a repeat is ignored (`recorded` false); `422` (accepted already) is a `Rejected` result, not an error. */
  declineAdaptation(adaptationId: string): Promise<DeclineAdaptationResult>;
  /** Everything Stamina holds about the signed-in user. */
  exportData(): Promise<UserExport>;
  /** Hard-deletes the signed-in user's rows. Resolves once they are gone. */
  deleteAccount(): Promise<void>;
}
