import { SportStatus } from '@stamina/domain';
import { z } from 'zod';
import { sportProfileSchema, sportSourcesSchema } from './sport-profile-schema.ts';

/** A sport in the catalogue as a signed-in user may see it. */
export const catalogSportSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(SportStatus),
  /** True until the founder approves the sport: the person's plan is labelled beta. */
  beta: z.boolean(),
  /** `null` while nobody has drafted it yet. */
  profile: sportProfileSchema.nullable(),
  sources: sportSourcesSchema.nullable(),
  version: z.number().int().positive(),
});

export const sportListResponseSchema = z.object({ sports: z.array(catalogSportSchema) });
