import { BodyArea, SCREENING_QUESTIONS, ScreeningQuestion } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { SafetyMessageKey } from '../enums/safety-message-key.ts';
import { ScreeningField } from '../enums/screening-field.ts';
import type { ScreeningDraft } from '../types.ts';
import { createScreeningDraft } from './create-screening-draft.ts';
import { validateScreening } from './validate-screening.ts';

function answered(overrides: Partial<ScreeningDraft> = {}): ScreeningDraft {
  return {
    answers: Object.fromEntries(SCREENING_QUESTIONS.map((question) => [question, false])),
    bodyAreas: [],
    trainedRegularly: false,
    ...overrides,
  };
}

describe('validateScreening', () => {
  it('asks for every answer on an empty page', () => {
    const errors = validateScreening(createScreeningDraft());

    expect(Object.keys(errors).sort()).toEqual(
      [...SCREENING_QUESTIONS, ScreeningField.StartingLevel].sort(),
    );
    expect(Object.values(errors).every((key) => key === SafetyMessageKey.AnswerRequired)).toBe(
      true,
    );
  });

  it('accepts all ten answered with the starting level', () => {
    expect(validateScreening(answered())).toEqual({});
  });

  it('names only the question that is still open', () => {
    const draft = answered();
    delete draft.answers[ScreeningQuestion.Pregnancy];

    expect(validateScreening(draft)).toEqual({
      [ScreeningQuestion.Pregnancy]: SafetyMessageKey.AnswerRequired,
    });
  });

  it('asks for the starting level on its own', () => {
    expect(validateScreening(answered({ trainedRegularly: undefined }))).toEqual({
      [ScreeningField.StartingLevel]: SafetyMessageKey.AnswerRequired,
    });
  });

  it('needs an area when the bone, joint or muscle question is yes, and only then', () => {
    const yes = answered({
      answers: { ...answered().answers, [ScreeningQuestion.BoneJointMuscle]: true },
    });

    expect(validateScreening(yes)).toEqual({
      [ScreeningField.BodyAreas]: SafetyMessageKey.AreasRequired,
    });
    expect(validateScreening({ ...yes, bodyAreas: [BodyArea.Hip] })).toEqual({});
  });
});
