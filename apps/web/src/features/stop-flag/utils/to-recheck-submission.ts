import type { RecheckScreening } from '@stamina/contracts';
import type { ScreeningQuestion } from '@stamina/domain';
import { AREA_QUESTION } from '../../safety/index.ts';
import type { RecheckDraft } from '../types.ts';

/**
 * The body of the repeated questions: only the questions that were asked (the server keeps every
 * other answer), and the body areas only with a yes to the bone, joint and muscle question.
 * Returns undefined while a question is still unanswered, so a half answer is never sent.
 */
export function toRecheckSubmission(
  questions: readonly ScreeningQuestion[],
  draft: RecheckDraft,
): RecheckScreening | undefined {
  const answers: RecheckScreening['answers'] = {};
  for (const question of questions) {
    const answer = draft.answers[question];
    if (answer === undefined) return undefined;
    answers[question] = answer;
  }
  if (Object.keys(answers).length === 0) return undefined;
  return answers[AREA_QUESTION] === true ? { answers, bodyAreas: draft.bodyAreas } : { answers };
}
