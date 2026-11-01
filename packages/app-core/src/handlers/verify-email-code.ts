import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import { SessionStatus } from '../enums/session-status.ts';
import { emailSchema } from '../schemas/email-schema.ts';
import { otpCodeSchema } from '../schemas/otp-code-schema.ts';
import type { Services, SessionState, Stores, VerifyEmailCode } from '../types.ts';

export const verifyEmailCode = (email: string, code: string): VerifyEmailCode => ({
  type: RequestType.VerifyEmailCode,
  email,
  code,
});

export const verifyEmailCodeDefinition = defineRequest<VerifyEmailCode, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.VerifyEmailCode),
    email: emailSchema,
    code: otpCodeSchema,
  }),
  offline: OfflinePolicy.Never,
  handler: async ({ email, code }, { services, stores }) => {
    await services.auth.verifyEmailCode(email, code);
    // The first call to the API creates the user row, so the session is only signed in after it.
    const { userId } = await services.api.me();
    const state: SessionState = { status: SessionStatus.SignedIn, userId };
    stores.session.set(state);
    return state;
  },
});
