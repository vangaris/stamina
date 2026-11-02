import { ScreeningQuestion } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { SafetyMessageKey } from '../enums/safety-message-key.ts';
import { ScreeningField } from '../enums/screening-field.ts';
import { firstInvalidField } from './first-invalid-field.ts';

describe('firstInvalidField', () => {
  it('is the topmost open answer, whatever order the errors were added in', () => {
    const key = SafetyMessageKey.AnswerRequired;

    expect(
      firstInvalidField({
        [ScreeningField.StartingLevel]: key,
        [ScreeningQuestion.Pregnancy]: key,
        [ScreeningQuestion.Fainting]: key,
      }),
    ).toBe(ScreeningQuestion.Fainting);
  });

  it('puts the area picker right after the area question', () => {
    expect(
      firstInvalidField({
        [ScreeningQuestion.EatingDisorder]: SafetyMessageKey.AnswerRequired,
        [ScreeningField.BodyAreas]: SafetyMessageKey.AreasRequired,
      }),
    ).toBe(ScreeningField.BodyAreas);
  });

  it('is undefined when nothing is open', () => {
    expect(firstInvalidField({})).toBeUndefined();
  });
});
