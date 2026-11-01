import { describe, expect, it } from 'vitest';
import { TrainingWeekProblem } from '../enums/training-week-problem.ts';
import { Weekday } from '../enums/weekday.ts';
import { validateTrainingWeek } from './validate-training-week.ts';

const threeDays = [Weekday.Mon, Weekday.Wed, Weekday.Fri];

describe('validateTrainingWeek', () => {
  it('accepts sessions that fit the available days', () => {
    expect(
      validateTrainingWeek({ sessionsPerWeek: 3, sessionMinutes: 45, availableDays: threeDays }),
    ).toEqual([]);
  });

  it('accepts exactly as many available days as sessions, and the range ends 2 and 4', () => {
    for (const sessionsPerWeek of [2, 4]) {
      expect(
        validateTrainingWeek({
          sessionsPerWeek,
          sessionMinutes: 30,
          availableDays: [Weekday.Mon, Weekday.Tue, Weekday.Thu, Weekday.Sat],
        }),
      ).toEqual([]);
    }
  });

  it('rejects fewer than 2 or more than 4 sessions, and fractions', () => {
    for (const sessionsPerWeek of [1, 5, 2.5]) {
      expect(
        validateTrainingWeek({
          sessionsPerWeek,
          sessionMinutes: 45,
          availableDays: Object.values(Weekday),
        }),
      ).toContain(TrainingWeekProblem.SessionsOutOfRange);
    }
  });

  it('rejects a length that is not offered', () => {
    expect(
      validateTrainingWeek({ sessionsPerWeek: 3, sessionMinutes: 50, availableDays: threeDays }),
    ).toEqual([TrainingWeekProblem.LengthNotOffered]);
  });

  it('rejects fewer available days than sessions, counting a repeated day once', () => {
    expect(
      validateTrainingWeek({
        sessionsPerWeek: 3,
        sessionMinutes: 45,
        availableDays: [Weekday.Mon, Weekday.Mon, Weekday.Fri],
      }),
    ).toEqual([TrainingWeekProblem.TooFewAvailableDays]);
  });
});
