import type { ScreeningQuestion } from '@stamina/domain';
import { AREA_QUESTION } from '../../safety/index.ts';
import { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';
import type { RecheckDraft, RecheckErrors } from '../types.ts';

/** What is missing from the repeated questions: every unanswered one, and an area when the bone, joint and muscle answer is yes. */
export function validateRecheck(
  questions: readonly ScreeningQuestion[],
  draft: RecheckDraft,
): RecheckErrors {
  const answers = Object.fromEntries(
    questions
      .filter((question) => draft.answers[question] === undefined)
      .map((question) => [question, StopFlagMessageKey.AnswerRequired]),
  );
  const needsAreas =
    questions.includes(AREA_QUESTION) &&
    draft.answers[AREA_QUESTION] === true &&
    draft.bodyAreas.length === 0;
  return needsAreas ? { answers, bodyAreas: StopFlagMessageKey.AreasRequired } : { answers };
}
