import { INVITE_CODE_INPUT_MAX_LENGTH } from '@stamina/domain';
import { z } from 'zod';
import { profileAnswersSchema } from './profile-answers-schema.ts';

/**
 * `POST /profile`: the answers plus the invite code that lets this person in. An over-long code
 * is a malformed body (400).
 */
export const profileSubmissionSchema = z.intersection(
  profileAnswersSchema,
  z.object({ inviteCode: z.string().min(1).max(INVITE_CODE_INPUT_MAX_LENGTH) }),
);
