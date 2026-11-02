import { normalizeInviteCode } from '@stamina/domain';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { CheckInvite, Services, Stores } from '../types.ts';

export const checkInvite = (code: string): CheckInvite => ({
  type: RequestType.CheckInvite,
  code,
});

/**
 * Asks the API whether the code can still be used, without signing in. A code that cannot be a
 * code at all is answered locally. A valid code is remembered (canonical form) for the sign-in
 * that follows; an invalid one forgets any earlier code, so the stored state is the last answer.
 */
export const checkInviteDefinition = defineRequest<CheckInvite, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.CheckInvite), code: z.string().trim().min(1) }),
  offline: OfflinePolicy.Never,
  handler: async ({ code }, { services }) => {
    const canonical = normalizeInviteCode(code);
    const { valid } = canonical ? await services.api.checkInvite(canonical) : { valid: false };
    if (canonical && valid) services.inviteStorage.save(canonical);
    else services.inviteStorage.clear();
    return { valid };
  },
});
