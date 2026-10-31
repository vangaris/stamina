import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { Services, StartGoogleSignIn, Stores } from '../types.ts';

export const startGoogleSignIn = (callbackUrl: string): StartGoogleSignIn => ({
  type: RequestType.StartGoogleSignIn,
  callbackUrl,
});

export const startGoogleSignInDefinition = defineRequest<StartGoogleSignIn, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.StartGoogleSignIn),
    callbackUrl: z.string().min(1),
  }),
  offline: OfflinePolicy.Never,
  handler: ({ callbackUrl }, { services }) => services.auth.startGoogleSignIn(callbackUrl),
});
