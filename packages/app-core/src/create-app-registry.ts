import { RequestType } from './enums/request-type.ts';
import { confirmDoctorSeenDefinition } from './handlers/confirm-doctor-seen.ts';
import { getLatestCheckinDefinition } from './handlers/get-latest-checkin.ts';
import { recheckScreeningDefinition } from './handlers/recheck-screening.ts';
import { reportStopFlagDefinition } from './handlers/report-stop-flag.ts';
import { submitCheckinDefinition } from './handlers/submit-checkin.ts';
import { checkInviteDefinition } from './handlers/check-invite.ts';
import { deleteAccountDefinition } from './handlers/delete-account.ts';
import { createProgramDefinition } from './handlers/create-program.ts';
import { exportDataDefinition } from './handlers/export-data.ts';
import { getHealthDefinition } from './handlers/get-health.ts';
import { getProgramDefinition } from './handlers/get-program.ts';
import { getProfileDefinition } from './handlers/get-profile.ts';
import { getSafetyDefinition } from './handlers/get-safety.ts';
import { getSessionDefinition } from './handlers/get-session.ts';
import { getSessionDetailDefinition } from './handlers/get-session-detail.ts';
import { finishSessionDefinition } from './handlers/finish-session.ts';
import { getWeekLoadDefinition } from './handlers/get-week-load.ts';
import { logActivityDefinition } from './handlers/log-activity.ts';
import { logSetDefinition } from './handlers/log-set.ts';
import { grantConsentDefinition } from './handlers/grant-consent.ts';
import { recordDoctorOkDefinition } from './handlers/record-doctor-ok.ts';
import { requestEmailCodeDefinition } from './handlers/request-email-code.ts';
import { saveProfileDefinition } from './handlers/save-profile.ts';
import { saveScreeningDefinition } from './handlers/save-screening.ts';
import { signOutDefinition } from './handlers/sign-out.ts';
import { startGoogleSignInDefinition } from './handlers/start-google-sign-in.ts';
import { verifyEmailCodeDefinition } from './handlers/verify-email-code.ts';
import type { RequestRegistry, Services, Stores } from './types.ts';

/** Every request the app handles, by type: the mediator routes with it and the sync replays with it. */
export function createAppRegistry(): RequestRegistry<Services, Stores> {
  return {
    [RequestType.GetHealth]: getHealthDefinition,
    [RequestType.RequestEmailCode]: requestEmailCodeDefinition,
    [RequestType.VerifyEmailCode]: verifyEmailCodeDefinition,
    [RequestType.StartGoogleSignIn]: startGoogleSignInDefinition,
    [RequestType.SignOut]: signOutDefinition,
    [RequestType.GetSession]: getSessionDefinition,
    [RequestType.CheckInvite]: checkInviteDefinition,
    [RequestType.GetProfile]: getProfileDefinition,
    [RequestType.SaveProfile]: saveProfileDefinition,
    [RequestType.GetSafety]: getSafetyDefinition,
    [RequestType.GrantConsent]: grantConsentDefinition,
    [RequestType.SaveScreening]: saveScreeningDefinition,
    [RequestType.RecordDoctorOk]: recordDoctorOkDefinition,
    [RequestType.ExportData]: exportDataDefinition,
    [RequestType.DeleteAccount]: deleteAccountDefinition,
    [RequestType.GetProgram]: getProgramDefinition,
    [RequestType.CreateProgram]: createProgramDefinition,
    [RequestType.GetSessionDetail]: getSessionDetailDefinition,
    [RequestType.LogSet]: logSetDefinition,
    [RequestType.FinishSession]: finishSessionDefinition,
    [RequestType.LogActivity]: logActivityDefinition,
    [RequestType.GetWeekLoad]: getWeekLoadDefinition,
    [RequestType.SubmitCheckin]: submitCheckinDefinition,
    [RequestType.GetLatestCheckin]: getLatestCheckinDefinition,
    [RequestType.ReportStopFlag]: reportStopFlagDefinition,
    [RequestType.ConfirmDoctorSeen]: confirmDoctorSeenDefinition,
    [RequestType.RecheckScreening]: recheckScreeningDefinition,
  } satisfies Record<RequestType, unknown>;
}
