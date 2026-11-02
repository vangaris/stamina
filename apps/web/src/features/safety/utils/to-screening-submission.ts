import type { ScreeningSubmission } from '@stamina/contracts';
import { StartingLevel, type ScreeningQuestion } from '@stamina/domain';
import { QUESTIONS } from '../config.ts';
import type { ScreeningDraft } from '../types.ts';

/** What is sent: all ten answers, the areas, the starting level. `undefined` while anything is unanswered. */
export function toScreeningSubmission(draft: ScreeningDraft): ScreeningSubmission | undefined {
  if (draft.trainedRegularly === undefined) return undefined;
  const answers: Partial<Record<ScreeningQuestion, boolean>> = {};
  for (const question of QUESTIONS) {
    const answer = draft.answers[question];
    if (answer === undefined) return undefined;
    answers[question] = answer;
  }
  return {
    answers: answers as ScreeningSubmission['answers'],
    bodyAreas: draft.bodyAreas,
    startingLevel: draft.trainedRegularly ? StartingLevel.Regular : StartingLevel.Beginner,
  };
}
