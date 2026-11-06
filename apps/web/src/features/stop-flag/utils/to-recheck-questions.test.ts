import { ScreeningQuestion, StopFlag } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { toRecheckQuestions } from './to-recheck-questions.ts';

describe('toRecheckQuestions', () => {
  it('is empty for no flags and for a flag that asks nothing', () => {
    expect(toRecheckQuestions([])).toEqual([]);
    expect(toRecheckQuestions([StopFlag.Fever])).toEqual([]);
  });

  it('lists the questions of one flag in its order', () => {
    expect(toRecheckQuestions([StopFlag.ChestPain])).toEqual([
      ScreeningQuestion.HeartCondition,
      ScreeningQuestion.ChestPain,
    ]);
  });

  it('asks a question once when flags share it', () => {
    expect(
      toRecheckQuestions([StopFlag.ChestPain, StopFlag.Heartbeat, StopFlag.HeadKnock]),
    ).toEqual([
      ScreeningQuestion.HeartCondition,
      ScreeningQuestion.ChestPain,
      ScreeningQuestion.HeadInjury,
    ]);
  });
});
