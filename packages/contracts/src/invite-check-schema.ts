import { z } from 'zod';

/** `POST /invites/check` (no sign-in needed): is this code one a person can still use? */
export const inviteCheckRequestSchema = z.object({ code: z.string().min(1) });
export const inviteCheckResponseSchema = z.object({ valid: z.boolean() });
