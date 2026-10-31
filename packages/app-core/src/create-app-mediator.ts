import { createMediator } from './create-mediator.ts';
import { RequestType } from './enums/request-type.ts';
import { getHealthDefinition } from './handlers/get-health.ts';
import { getSessionDefinition } from './handlers/get-session.ts';
import { requestEmailCodeDefinition } from './handlers/request-email-code.ts';
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
    } satisfies Record<RequestType, unknown>,
  });
}
