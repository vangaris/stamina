import { AREA_QUESTION, QUESTIONS } from '../config.ts';
import { SafetyMessageKey } from '../enums/safety-message-key.ts';
import { ScreeningField } from '../enums/screening-field.ts';
import type { ScreeningDraft, ScreeningErrors } from '../types.ts';

/** What is not answered yet: every question, the areas when that question is yes, the starting level. */
export function validateScreening(draft: ScreeningDraft): ScreeningErrors {
  const errors: ScreeningErrors = {};
  for (const question of QUESTIONS) {
    if (draft.answers[question] === undefined) errors[question] = SafetyMessageKey.AnswerRequired;
  }
  if (draft.answers[AREA_QUESTION] === true && draft.bodyAreas.length === 0) {
    errors[ScreeningField.BodyAreas] = SafetyMessageKey.AreasRequired;
  }
  if (draft.trainedRegularly === undefined) {
    errors[ScreeningField.StartingLevel] = SafetyMessageKey.AnswerRequired;
  }
  return errors;
}
