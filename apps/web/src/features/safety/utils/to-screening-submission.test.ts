import { BodyArea, SCREENING_QUESTIONS, ScreeningQuestion, StartingLevel } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import type { ScreeningDraft } from '../types.ts';
import { createScreeningDraft } from './create-screening-draft.ts';
import { toScreeningSubmission } from './to-screening-submission.ts';

const complete = (overrides: Partial<ScreeningDraft> = {}): ScreeningDraft => ({
  answers: Object.fromEntries(SCREENING_QUESTIONS.map((question) => [question, false])),
  bodyAreas: [],
  trainedRegularly: false,
  ...overrides,
});

describe('toScreeningSubmission', () => {
  it('sends every answer, with Beginner for "no" to the starting-level question', () => {
    const submission = toScreeningSubmission(complete());

    expect(Object.keys(submission!.answers).sort()).toEqual([...SCREENING_QUESTIONS].sort());
    expect(submission).toMatchObject({ bodyAreas: [], startingLevel: StartingLevel.Beginner });
  });

  it('sends Regular for "yes" to the starting-level question and keeps the picked areas', () => {
    const submission = toScreeningSubmission(
      complete({
        trainedRegularly: true,
        answers: { ...complete().answers, [ScreeningQuestion.BoneJointMuscle]: true },
        bodyAreas: [BodyArea.Knee],
      }),
    );

    expect(submission).toMatchObject({
      startingLevel: StartingLevel.Regular,
      bodyAreas: [BodyArea.Knee],
      answers: { [ScreeningQuestion.BoneJointMuscle]: true },
    });
  });

  it('sends nothing while a question or the starting level is open', () => {
    expect(toScreeningSubmission(createScreeningDraft())).toBeUndefined();
    expect(toScreeningSubmission(complete({ trainedRegularly: undefined }))).toBeUndefined();
    const open = complete();
    delete open.answers[ScreeningQuestion.Fainting];
    expect(toScreeningSubmission(open)).toBeUndefined();
  });
});
