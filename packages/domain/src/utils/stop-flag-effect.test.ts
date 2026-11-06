import { describe, expect, it } from 'vitest';
import { ScreeningQuestion } from '../enums/screening-question.ts';
import { StopAction } from '../enums/stop-action.ts';
import { StopFlag } from '../enums/stop-flag.ts';
import { stopFlagEffect } from './stop-flag-effect.ts';

describe('stopFlagEffect', () => {
  it.each([StopFlag.ChestPain, StopFlag.Fainting, StopFlag.Breathlessness, StopFlag.Heartbeat])(
    '%s pauses training until a doctor has seen the person and shows the emergency number',
    (flag) => {
      expect(stopFlagEffect(flag)).toMatchObject({
        action: StopAction.PauseUntilDoctor,
        showEmergency: true,
      });
    },
  );

  it('rests the day for a fever, with no emergency number and no question to ask again', () => {
    expect(stopFlagEffect(StopFlag.Fever)).toEqual({
      action: StopAction.RestToday,
      showEmergency: false,
      recheck: [],
    });
  });

  it('leaves out the reported area for new pain and asks the bone, joint and muscle question again', () => {
    expect(stopFlagEffect(StopFlag.NewPain)).toEqual({
      action: StopAction.ExcludeArea,
      showEmergency: false,
      recheck: [ScreeningQuestion.BoneJointMuscle],
    });
  });

  it('pauses until cleared after a head knock and asks the head injury question again', () => {
    expect(stopFlagEffect(StopFlag.HeadKnock)).toEqual({
      action: StopAction.PauseUntilCleared,
      showEmergency: false,
      recheck: [ScreeningQuestion.HeadInjury],
    });
  });

  it('asks a Screening question again for every flag that names its symptom', () => {
    expect(stopFlagEffect(StopFlag.ChestPain).recheck).toContain(ScreeningQuestion.ChestPain);
    expect(stopFlagEffect(StopFlag.Fainting).recheck).toContain(ScreeningQuestion.Fainting);
    expect(stopFlagEffect(StopFlag.Breathlessness).recheck).toContain(ScreeningQuestion.Breathing);
    expect(stopFlagEffect(StopFlag.Heartbeat).recheck).toContain(ScreeningQuestion.HeartCondition);
  });
});
