import { describe, expect, it } from 'vitest';
import { MAX_RIR } from '../config.ts';
import { TrainingMode } from '../enums/training-mode.ts';
import { PADEL_GENERATION, WEEK_START } from '../testing/adaptation-fixtures.ts';
import { generateWeek } from './generate-week.ts';

const week = (weekInBlock: number, extra: { rirBoost?: number } = {}, limited = false) =>
  generateWeek({
    ...PADEL_GENERATION,
    mode: limited ? TrainingMode.Limited : TrainingMode.Full,
    weekInBlock,
    startsOn: WEEK_START,
    ...extra,
  })!;

describe('generateWeek rirBoost', () => {
  it('is the same week without a boost and with a boost of zero', () => {
    expect(week(1, { rirBoost: 0 })).toEqual(week(1));
  });

  it('adds the boost to every rated exercise and changes nothing else', () => {
    const plain = week(1);
    const boosted = week(1, { rirBoost: 1 });
    expect(boosted.sessions.map(({ date, focus }) => [date, focus])).toEqual(
      plain.sessions.map(({ date, focus }) => [date, focus]),
    );
    boosted.sessions.forEach((session, index) =>
      session.exercises.forEach((exercise, i) => {
        const old = plain.sessions[index]!.exercises[i]!;
        expect({ ...exercise, rir: old.rir }).toEqual(old);
        expect(exercise.rir).toBe(old.rir === null ? null : old.rir + 1);
      }),
    );
  });

  it('never goes past the most reps in reserve, also for a Limited person', () => {
    for (const limited of [false, true]) {
      const rirs = week(4, { rirBoost: 3 }, limited)
        .sessions.flatMap((s) => s.exercises)
        .flatMap(({ rir }) => (rir === null ? [] : [rir]));
      expect(Math.max(...rirs)).toBe(MAX_RIR);
    }
  });
});
