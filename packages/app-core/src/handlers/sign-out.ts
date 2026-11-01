import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import { SessionStatus } from '../enums/session-status.ts';
import type { Services, SignOut, Stores } from '../types.ts';

export const signOut = (): SignOut => ({ type: RequestType.SignOut });

export const signOutDefinition = defineRequest<SignOut, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.SignOut) }),
  offline: OfflinePolicy.Never,
  handler: async (_request, { services, stores }) => {
    await services.auth.signOut();
    stores.session.set({ status: SessionStatus.SignedOut });
  },
});
