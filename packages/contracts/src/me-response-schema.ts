import { z } from 'zod';

/** `GET /me`: the signed-in user's id. Creates the `app_user` row on the first call. */
export const meResponseSchema = z.object({
  userId: z.guid(),
});
