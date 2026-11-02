import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { DeleteAccount, Services, Stores } from '../types.ts';

export const deleteAccount = (): DeleteAccount => ({ type: RequestType.DeleteAccount });

/** Deletes everything Stamina holds about the person. Signing out afterwards is the caller's step. */
export const deleteAccountDefinition = defineRequest<DeleteAccount, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.DeleteAccount) }),
  offline: OfflinePolicy.Never,
  handler: (_request, { services }) => services.api.deleteAccount(),
});
