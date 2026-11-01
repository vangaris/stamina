import { z } from 'zod';
import { profileAnswersSchema } from './profile-answers-schema.ts';

/** A stored profile: the answers, plus what the server derived from them. */
export const savedProfileSchema = z.intersection(
  profileAnswersSchema,
  z.object({
    /** "Hot conditions" default: on for kite, windsurf and beach volleyball. */
    hotConditionsDefault: z.boolean(),
  }),
);
