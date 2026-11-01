import { INVITE_CODE_INPUT_MAX_LENGTH } from '@stamina/domain';
import { z } from 'zod';

/**
 * `POST /invites/check` (no sign-in needed): is this code one a person can still use? Input over
 * `INVITE_CODE_INPUT_MAX_LENGTH` is a malformed body (400), not an invalid code.
 */
export const inviteCheckRequestSchema = z.object({
  code: z.string().min(1).max(INVITE_CODE_INPUT_MAX_LENGTH),
});
export const inviteCheckResponseSchema = z.object({ valid: z.boolean() });
