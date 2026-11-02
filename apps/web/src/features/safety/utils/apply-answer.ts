import type { ScreeningQuestion } from '@stamina/domain';
import { AREA_QUESTION } from '../config.ts';
import type { ScreeningDraft } from '../types.ts';

/** The draft with one question answered. Answering the area question "no" drops the picked areas. */
export function applyAnswer(
  draft: ScreeningDraft,
  question: ScreeningQuestion,
  answer: boolean,
): ScreeningDraft {
  const clearsAreas = question === AREA_QUESTION && !answer;
  return {
    ...draft,
    answers: { ...draft.answers, [question]: answer },
    bodyAreas: clearsAreas ? [] : draft.bodyAreas,
  };
}
