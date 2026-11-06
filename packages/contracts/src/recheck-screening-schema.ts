import { BodyArea, ScreeningQuestion } from '@stamina/domain';
import { z } from 'zod';

/**
 * The Screening questions asked again after a stop flag: only the questions being answered again
 * (at least one); every other answer, and the starting level, carries over from the latest
 * Screening. Body areas come with the bone, joint and muscle question, and only then.
 */
export const recheckScreeningSchema = z
  .object({
    answers: z
      .partialRecord(z.enum(ScreeningQuestion), z.boolean())
      .refine((answers) => Object.keys(answers).length > 0),
    bodyAreas: z.array(z.enum(BodyArea)).max(Object.values(BodyArea).length).optional(),
  })
  .refine(
    ({ answers, bodyAreas }) =>
      answers[ScreeningQuestion.BoneJointMuscle] === undefined
        ? bodyAreas === undefined
        : answers[ScreeningQuestion.BoneJointMuscle] ===
          (bodyAreas !== undefined && bodyAreas.length > 0),
    { path: ['bodyAreas'] },
  );
