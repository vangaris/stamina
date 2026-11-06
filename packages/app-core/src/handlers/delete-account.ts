import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { DeleteAccount, Services, Stores } from '../types.ts';

export const deleteAccount = (): DeleteAccount => ({ type: RequestType.DeleteAccount });

/** Deletes everything Stamina holds about the person, on the server and on this device. Signing out afterwards is the caller's step. */
export const deleteAccountDefinition = defineRequest<DeleteAccount, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.DeleteAccount) }),
  offline: OfflinePolicy.Never,
  handler: async (_request, { services }) => {
    await services.api.deleteAccount();
    await services.localData.clear();
  },
});
