import { z } from 'zod';
import { savedProfileSchema } from './saved-profile-schema.ts';

/** `GET /profile`: the signed-in user's profile, or `null` before onboarding. */
export const getProfileResponseSchema = z.object({ profile: savedProfileSchema.nullable() });
