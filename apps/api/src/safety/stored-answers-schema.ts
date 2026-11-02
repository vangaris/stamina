import { BodyArea, ScreeningQuestion } from '@stamina/domain';
import { z } from 'zod';

/** The decrypted payload of a Screening row; parsing it guards against a corrupt or foreign row. */
export const storedAnswersSchema = z.object({
  answers: z.record(z.enum(ScreeningQuestion), z.boolean()),
  bodyAreas: z.array(z.enum(BodyArea)),
});
