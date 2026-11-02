import { BodyArea, ScreeningQuestion, StartingLevel } from '@stamina/domain';
import { z } from 'zod';

/**
 * The Screening page: one yes/no per question ("if unsure" is yes), the body areas when the
 * bone, joint or muscle question is yes, and the starting-level question. All ten answers are
 * required; areas are required exactly when that question is yes.
 */
export const screeningSubmissionSchema = z
  .object({
    answers: z.record(z.enum(ScreeningQuestion), z.boolean()),
    bodyAreas: z.array(z.enum(BodyArea)).max(Object.values(BodyArea).length),
    startingLevel: z.enum(StartingLevel),
  })
  .refine(
    ({ answers, bodyAreas }) => answers[ScreeningQuestion.BoneJointMuscle] === bodyAreas.length > 0,
    { path: ['bodyAreas'] },
  );
