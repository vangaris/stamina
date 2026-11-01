import { z } from 'zod';
import { profileAnswersSchema } from './profile-answers-schema.ts';

/** `POST /profile`: the answers plus the invite code that lets this person in. */
export const profileSubmissionSchema = z.intersection(
  profileAnswersSchema,
  z.object({ inviteCode: z.string().min(1) }),
);
