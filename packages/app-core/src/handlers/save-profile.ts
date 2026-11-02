import {
  ProfileRejection,
  profileAnswersSchema,
  SaveProfileStatus,
  type SaveProfileResult,
} from '@stamina/contracts';
import { z } from 'zod';
import { defineRequest } from '../define-request.ts';
import { OfflinePolicy } from '../enums/offline-policy.ts';
import { RequestType } from '../enums/request-type.ts';
import type { SaveProfile, Services, Stores } from '../types.ts';

export const saveProfile = (answers: SaveProfile['answers']): SaveProfile => ({
  type: RequestType.SaveProfile,
  answers,
});

/**
 * Sends the answers with the remembered invite code. A turned-away applicant (under 18, outside
 * the EU/EEA, invite not usable) is a `Rejected` result, not an error; nothing is stored for
 * those. A saved profile uses the invite up and an unusable invite is forgotten (so the person
 * is sent back to enter another); the other rejections keep it.
 */
export const saveProfileDefinition = defineRequest<SaveProfile, Services, Stores>({
  schema: z.object({
    type: z.literal(RequestType.SaveProfile),
    answers: profileAnswersSchema,
  }),
  offline: OfflinePolicy.Never,
  handler: async ({ answers }, { services }) => {
    const inviteCode = services.inviteStorage.get();
    const result: SaveProfileResult = inviteCode
      ? await services.api.saveProfile({ ...answers, inviteCode })
      : { status: SaveProfileStatus.Rejected, reason: ProfileRejection.InviteInvalid };

    const inviteUsedOrUnusable =
      result.status === SaveProfileStatus.Saved || result.reason === ProfileRejection.InviteInvalid;
    if (inviteUsedOrUnusable) services.inviteStorage.clear();
    return result;
  },
});
