import {
  ProfileRejection,
  profileAnswersSchema,
  SaveProfileStatus,
  type SaveProfileResult,
} from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { ProfileStatus } from '../enums/profile-status.ts';
import { RequestType } from '../enums/request-type.ts';
import type { SaveProfile, Services, Stores } from '../types.ts';

export const saveProfile = (answers: SaveProfile['answers']): SaveProfile => ({
  type: RequestType.SaveProfile,
  answers,
});

/**
 * Sends the answers with the remembered invite code. A turned-away applicant (under 18, outside
 * the EU/EEA, invite not usable) is a `Rejected` result, not an error; nothing is stored for
 * those. Only a saved profile clears the invite and fills the profile store, and an unusable
 * invite is forgotten so the person is sent back to enter another.
 */
export const saveProfileDefinition = defineRequest<SaveProfile, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.SaveProfile),
    answers: profileAnswersSchema,
  }),
  offline: OfflinePolicy.Never,
  handler: async ({ answers }, { services, stores }) => {
    const inviteCode = services.inviteStorage.get();
    const result: SaveProfileResult = inviteCode
      ? await services.api.saveProfile({ ...answers, inviteCode })
      : { status: SaveProfileStatus.Rejected, reason: ProfileRejection.InviteInvalid };

    if (result.status === SaveProfileStatus.Saved) {
      services.inviteStorage.clear();
      stores.profile.set({ status: ProfileStatus.Present, profile: result.profile });
    } else if (result.reason === ProfileRejection.InviteInvalid) {
      services.inviteStorage.clear();
    }
    return result;
  },
});
