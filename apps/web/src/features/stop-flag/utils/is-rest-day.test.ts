import { SafetyStatus, type SafetyState } from '@stamina/app-core';
import { describe, expect, it } from 'vitest';
import { makeScreening, makeStop } from '../testing/make-safety-state.ts';
import { isRestDay } from './is-rest-day.ts';

const TODAY = '2026-11-06';

describe('isRestDay', () => {
  it('is true on the day of a fever, for a person ready to train', () => {
    const state: SafetyState = {
      status: SafetyStatus.Ready,
      screening: makeScreening(),
      stop: makeStop({ restOn: TODAY }),
    };

    expect(isRestDay(state, TODAY)).toBe(true);
  });

  it('is false the next day, and when there was no fever', () => {
    const fever: SafetyState = {
      status: SafetyStatus.Ready,
      screening: makeScreening(),
      stop: makeStop({ restOn: '2026-11-05' }),
    };
    const none: SafetyState = {
      status: SafetyStatus.Ready,
      screening: makeScreening(),
      stop: makeStop(),
    };

    expect(isRestDay(fever, TODAY)).toBe(false);
    expect(isRestDay(none, TODAY)).toBe(false);
  });

  it('is false before the person has finished the safety steps', () => {
    expect(isRestDay({ status: SafetyStatus.ScreeningNeeded }, TODAY)).toBe(false);
  });
});
