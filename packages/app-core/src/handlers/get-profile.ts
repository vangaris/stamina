import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { ProfileStatus } from '../enums/profile-status.ts';
import { RequestType } from '../enums/request-type.ts';
import type { GetProfile, ProfileState, Services, Stores } from '../types.ts';

export const getProfile = (): GetProfile => ({ type: RequestType.GetProfile });

/**
 * Where the signed-in user stands: profile saved, no profile but an invite in hand, or no
 * profile and no invite. The profile itself is never logged (the pipeline logs no results).
 */
export const getProfileDefinition = defineRequest<GetProfile, Services, Stores>({
  schema: z.object({ type: z.literal(RequestType.GetProfile) }),
  offline: OfflinePolicy.Never,
  handler: async (_request, { services, stores }) => {
    const profile = await services.api.getProfile();
    let state: ProfileState;
    if (profile) state = { status: ProfileStatus.Present, profile };
    else if (services.inviteStorage.get()) state = { status: ProfileStatus.NotStarted };
    else state = { status: ProfileStatus.InviteNeeded };
    stores.profile.set(state);
    return state;
  },
});
