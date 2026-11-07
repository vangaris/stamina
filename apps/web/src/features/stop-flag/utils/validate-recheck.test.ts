import { BodyArea, ScreeningQuestion } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';
import { validateRecheck } from './validate-recheck.ts';

const draft = (
  answers: Partial<Record<ScreeningQuestion, boolean>> = {},
  bodyAreas: BodyArea[] = [],
) => ({ answers, bodyAreas, trainedRegularly: undefined });

describe('validateRecheck', () => {
  it('asks for every question that is not answered yet', () => {
    const errors = validateRecheck(
      [ScreeningQuestion.HeartCondition, ScreeningQuestion.ChestPain],
      draft({ [ScreeningQuestion.ChestPain]: false }),
    );

    expect(errors).toEqual({
      answers: { [ScreeningQuestion.HeartCondition]: StopFlagMessageKey.AnswerRequired },
    });
  });

  it('has no errors once everything is answered', () => {
    expect(validateRecheck([ScreeningQuestion.Fainting], draft({ fainting: true }))).toEqual({
      answers: {},
    });
  });

  it('asks for an area when the bone, joint and muscle answer is yes', () => {
    const errors = validateRecheck(
      [ScreeningQuestion.BoneJointMuscle],
      draft({ [ScreeningQuestion.BoneJointMuscle]: true }),
    );

    expect(errors.bodyAreas).toBe(StopFlagMessageKey.AreasRequired);
  });

  it('is satisfied with an area, or with a no and none', () => {
    const yes = validateRecheck(
      [ScreeningQuestion.BoneJointMuscle],
      draft({ [ScreeningQuestion.BoneJointMuscle]: true }, [BodyArea.Knee]),
    );
    const no = validateRecheck(
      [ScreeningQuestion.BoneJointMuscle],
      draft({ [ScreeningQuestion.BoneJointMuscle]: false }),
    );

    expect(yes).toEqual({ answers: {} });
    expect(no).toEqual({ answers: {} });
  });

  it('does not ask for an area when the question is not being asked', () => {
    expect(validateRecheck([ScreeningQuestion.HeadInjury], draft({ 'head-injury': true }))).toEqual(
      { answers: {} },
    );
  });
});
