import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import { emailSchema } from '../schemas/email-schema.ts';
import { otpCodeSchema } from '../schemas/otp-code-schema.ts';
import { claimSignedInState } from '../utils/claim-signed-in-state.ts';
import type { Services, Stores, VerifyEmailCode } from '../types.ts';

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
    const state = await claimSignedInState(services);
    stores.session.set(state);
    return state;
  },
});
