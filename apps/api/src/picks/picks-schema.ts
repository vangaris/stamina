import { SessionSlot } from '@stamina/domain';
import { z } from 'zod';
import { PICK_REASON_MAX_LENGTH } from './config.ts';

/**
 * What the model returns for one Session: one entry per chosen exercise, with the slot it fills
 * and a short reason. Whether the ids are real candidates, the counts and duplicates are checked
 * by the domain's `validatePicks`, not here.
 */
export const sessionPicksSchema = z.object({
  picks: z.array(
    z.object({
      slot: z.enum(SessionSlot),
      exerciseId: z.string().min(1),
      reason: z.string().min(1).max(PICK_REASON_MAX_LENGTH),
    }),
  ),
});
