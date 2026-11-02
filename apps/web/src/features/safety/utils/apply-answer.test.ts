import { BodyArea, ScreeningQuestion } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { applyAnswer } from './apply-answer.ts';
import { createScreeningDraft } from './create-screening-draft.ts';

describe('applyAnswer', () => {
  it('records the answer without touching the others', () => {
    const draft = applyAnswer(createScreeningDraft(), ScreeningQuestion.Fainting, true);

    expect(draft.answers).toEqual({ [ScreeningQuestion.Fainting]: true });
  });

  it('forgets the picked areas when the area question turns to no', () => {
    const picked = {
      ...applyAnswer(createScreeningDraft(), ScreeningQuestion.BoneJointMuscle, true),
      bodyAreas: [BodyArea.Knee],
    };

    const draft = applyAnswer(picked, ScreeningQuestion.BoneJointMuscle, false);

    expect(draft.bodyAreas).toEqual([]);
  });

  it('keeps the picked areas for any other answer', () => {
    const picked = { ...createScreeningDraft(), bodyAreas: [BodyArea.Knee] };

    expect(applyAnswer(picked, ScreeningQuestion.Fainting, false).bodyAreas).toEqual([
      BodyArea.Knee,
    ]);
  });
});
