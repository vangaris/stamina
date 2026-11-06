import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { AppErrorCode } from '../enums/app-error-code.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import { SessionStatus } from '../enums/session-status.ts';
import { AppError } from '../errors/app-error.ts';
import type { Services, SignOut, Stores } from '../types.ts';

export const signOut = (): SignOut => ({ type: RequestType.SignOut });

/**
 * Sends what still waits in the offline queue first (best effort), because signing out wipes the
 * device and those Session logs would be lost. If entries are still waiting afterwards nothing
 * happens and it rejects with `UnsyncedData`; the person can retry once the signal is back.
 * Otherwise it signs out and wipes the local data.
 */
export const signOutDefinition = defineRequest<SignOut, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.SignOut) }),
  offline: OfflinePolicy.Never,
  handler: async (_request, { services, stores, sync }) => {
    await sync().catch(() => undefined);
    if ((await services.offlineQueue.pending()).length > 0) {
      throw new AppError(AppErrorCode.UnsyncedData);
    }
    await services.auth.signOut();
    // The device may be handed to someone else: none of this person's data stays on it.
    await services.localData.clear();
    stores.session.set({ status: SessionStatus.SignedOut });
  },
});
