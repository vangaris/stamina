import { BodyArea, ScreeningQuestion } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { toRecheckSubmission } from './to-recheck-submission.ts';

const draft = (
  answers: Partial<Record<ScreeningQuestion, boolean>>,
  bodyAreas: BodyArea[] = [],
) => ({ answers, bodyAreas, trainedRegularly: undefined });

describe('toRecheckSubmission', () => {
  it('sends only the questions that were asked', () => {
    const submission = toRecheckSubmission(
      [ScreeningQuestion.Fainting],
      draft({ [ScreeningQuestion.Fainting]: true, [ScreeningQuestion.Pregnancy]: true }),
    );

    expect(submission).toEqual({ answers: { [ScreeningQuestion.Fainting]: true } });
  });

  it('is undefined while a question is unanswered, and when none is asked', () => {
    expect(
      toRecheckSubmission(
        [ScreeningQuestion.HeartCondition, ScreeningQuestion.ChestPain],
        draft({ [ScreeningQuestion.ChestPain]: false }),
      ),
    ).toBeUndefined();
    expect(toRecheckSubmission([], draft({}))).toBeUndefined();
  });

  it('sends the areas with a yes to the bone, joint and muscle question', () => {
    const submission = toRecheckSubmission(
      [ScreeningQuestion.BoneJointMuscle],
      draft({ [ScreeningQuestion.BoneJointMuscle]: true }, [BodyArea.Knee, BodyArea.Hip]),
    );

    expect(submission).toEqual({
      answers: { [ScreeningQuestion.BoneJointMuscle]: true },
      bodyAreas: [BodyArea.Knee, BodyArea.Hip],
    });
  });

  it('sends no areas with a no, even when some were picked before', () => {
    const submission = toRecheckSubmission(
      [ScreeningQuestion.BoneJointMuscle],
      draft({ [ScreeningQuestion.BoneJointMuscle]: false }, [BodyArea.Knee]),
    );

    expect(submission).toEqual({ answers: { [ScreeningQuestion.BoneJointMuscle]: false } });
  });
});
