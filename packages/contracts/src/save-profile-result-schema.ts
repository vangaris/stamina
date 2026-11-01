import { z } from 'zod';
import { ProfileRejection } from './enums/profile-rejection.ts';
import { SaveProfileStatus } from './enums/save-profile-status.ts';
import { savedProfileSchema } from './saved-profile-schema.ts';

/** `POST /profile` answers `200` with `Saved` or `422` with `Rejected`. */
export const saveProfileResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal(SaveProfileStatus.Saved), profile: savedProfileSchema }),
  z.object({ status: z.literal(SaveProfileStatus.Rejected), reason: z.enum(ProfileRejection) }),
]);
