import { AdaptationRule } from '@stamina/domain';
import { Locale, argumentNames, flattenMessages, messages } from '@stamina/i18n';
import { describe, expect, it } from 'vitest';
import { REASON_MESSAGE_KEYS } from '../config.ts';
import { toReasonMessage } from './to-reason-message.ts';

/** The names `AdaptationReasonParams` documents for each rule. */
const PARAMS: Record<AdaptationRule, string[]> = {
  [AdaptationRule.UnplannedActivity]: ['load', 'minutes', 'hours', 'windowHours'],
  [AdaptationRule.PoorCheckin]: ['sleep', 'soreness', 'energy'],
  [AdaptationRule.SoreArea]: ['soreness'],
  [AdaptationRule.DeloadLoad]: ['load', 'previousLoad', 'average', 'percent'],
  [AdaptationRule.DeloadCheckins]: ['count', 'days'],
  [AdaptationRule.DeloadEffort]: ['sessions', 'margin'],
  [AdaptationRule.RepeatWeek]: ['missed', 'weekInBlock'],
  [AdaptationRule.RestartBlock]: ['daysOff'],
};

describe('toReasonMessage', () => {
  it('hands the rule its own message and the numbers it was raised on', () => {
    expect(
      toReasonMessage({ ruleId: AdaptationRule.PoorCheckin, params: { sleep: 1, soreness: 2 } }),
    ).toEqual({ key: 'adaptation.reason.poor-checkin', params: { sleep: 1, soreness: 2 } });
  });

  describe.each(Object.values(Locale))('the %s messages', (locale) => {
    const flat = flattenMessages(messages[locale]);

    it.each(Object.values(AdaptationRule))(
      'give %s a reason that uses only the numbers the rule documents, all of them',
      (rule) => {
        const message = flat[REASON_MESSAGE_KEYS[rule]];

        expect(message).toBeTypeOf('string');
        expect(argumentNames(message!)).toEqual([...PARAMS[rule]].sort());
      },
    );
  });
});
