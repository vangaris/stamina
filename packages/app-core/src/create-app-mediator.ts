import { createMediator } from './create-mediator.ts';
import { RequestType } from './enums/request-type.ts';
import { checkInviteDefinition } from './handlers/check-invite.ts';
import { deleteAccountDefinition } from './handlers/delete-account.ts';
import { createProgramDefinition } from './handlers/create-program.ts';
import { exportDataDefinition } from './handlers/export-data.ts';
import { getHealthDefinition } from './handlers/get-health.ts';
import { getProgramDefinition } from './handlers/get-program.ts';
import { getProfileDefinition } from './handlers/get-profile.ts';
import { getSafetyDefinition } from './handlers/get-safety.ts';
import { getSessionDefinition } from './handlers/get-session.ts';
import { grantConsentDefinition } from './handlers/grant-consent.ts';
import { recordDoctorOkDefinition } from './handlers/record-doctor-ok.ts';
import { requestEmailCodeDefinition } from './handlers/request-email-code.ts';
import { saveProfileDefinition } from './handlers/save-profile.ts';
import { saveScreeningDefinition } from './handlers/save-screening.ts';
import { signOutDefinition } from './handlers/sign-out.ts';
import { startGoogleSignInDefinition } from './handlers/start-google-sign-in.ts';
import { verifyEmailCodeDefinition } from './handlers/verify-email-code.ts';
import type { AppMediatorOptions, Mediator } from './types.ts';

export function createAppMediator({ services, stores }: AppMediatorOptions): Mediator {
  return createMediator({
    services,
    stores,
    registry: {
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
    } satisfies Record<RequestType, unknown>,
  });
}
