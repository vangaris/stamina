import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import { emailSchema } from '../schemas/email-schema.ts';
import type { RequestEmailCode, Services, Stores } from '../types.ts';

export const requestEmailCode = (email: string): RequestEmailCode => ({
  type: RequestType.RequestEmailCode,
  email,
});

export const requestEmailCodeDefinition = defineRequest<RequestEmailCode, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.RequestEmailCode), email: emailSchema }),
  offline: OfflinePolicy.Never,
  handler: async ({ email }, { services }) => {
    await services.auth.requestEmailCode(email);
  },
});
