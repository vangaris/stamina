import { describe, expect, it } from 'vitest';
import { MAX_RIR, RESTART_RIR_STEP } from '../config.ts';
import { AdaptationChangeKind } from '../enums/adaptation-change-kind.ts';
import { AdaptationRule } from '../enums/adaptation-rule.ts';
import { BodyArea } from '../enums/body-area.ts';
import { SessionFocus } from '../enums/session-focus.ts';
import { SessionSlot } from '../enums/session-slot.ts';
import { TrainingMode } from '../enums/training-mode.ts';
import { Weekday } from '../enums/weekday.ts';
import {
  activityFact,
  adaptationContext,
  BASKETBALL_GENERATION,
  checkinFact,
  finishedFact,
  layout,
  LIBRARY,
  PADEL_GENERATION,
} from '../testing/adaptation-fixtures.ts';
import type {
  AdaptationContext,
  AdaptationSession,
  AppliedAdaptation,
  GeneratedExercise,
  GeneratedSession,
  GenerationBasis,
  RevisedSession,
} from '../types.ts';
import { applyAdaptation } from './apply-adaptation.ts';
import { generateWeek } from './generate-week.ts';
import { proposeAdaptations } from './propose-adaptations.ts';

const { Lower, Upper, Recovery } = SessionFocus;
const { MoveSession, SwapToRecovery, DropSet, LightenSession, SwapExercises, DeloadWeek } =
  AdaptationChangeKind;

const totalSets = (exercises: readonly GeneratedExercise[]) =>
  exercises.reduce((sum, { sets }) => sum + sets, 0);
const ratedRirs = (exercises: readonly GeneratedExercise[]) =>
  exercises.flatMap(({ rir }) => (rir === null ? [] : [rir]));
const sessionOnly = (applied: AppliedAdaptation | null): RevisedSession => {
  expect(applied).not.toBeNull();
  expect(applied!.sessions).toHaveLength(1);
  return applied!.sessions[0]!;
};

/**
 * Nothing an Adaptation stores is ever harder than what it replaces: no more sets, no fewer
 * reps in reserve (kept exercises one by one, the Session's lowest too), and a moved Session
 * never lands before today.
 */
function expectNeverHarder(applied: AppliedAdaptation, context: AdaptationContext): void {
  if (applied.block !== null) return;
  for (const revised of applied.sessions) {
    const before = context.sessions.find(({ id }) => id === revised.supersedes)!;
    expect(totalSets(revised.exercises)).toBeLessThanOrEqual(totalSets(before.exercises));
    const rirBefore = ratedRirs(before.exercises);
    const rirAfter = ratedRirs(revised.exercises);
    if (rirBefore.length > 0 && rirAfter.length > 0) {
      expect(Math.min(...rirAfter)).toBeGreaterThanOrEqual(Math.min(...rirBefore));
    }
    for (const exercise of revised.exercises) {
      const same = before.exercises.find(
        ({ exerciseId, slot }) => exerciseId === exercise.exerciseId && slot === exercise.slot,
      );
      if (same === undefined) continue;
      expect(exercise.sets).toBeLessThanOrEqual(same.sets);
      if (same.rir !== null) expect(exercise.rir).toBeGreaterThanOrEqual(same.rir);
    }
    for (const exercise of revised.exercises) {
      expect(exercise.sets).toBeGreaterThanOrEqual(1);
      if (exercise.rir !== null) expect(exercise.rir).toBeLessThanOrEqual(MAX_RIR);
    }
    if (revised.date !== before.date) expect(revised.date >= context.today).toBe(true);
    expect(revised.minutes).toBe(before.minutes);
  }
}

describe('applyAdaptation', () => {
  const ctx = (sessions: AdaptationSession[], overrides: Partial<AdaptationContext> = {}) =>
    adaptationContext({ today: '2026-11-04', sessions, ...overrides });

  describe('MoveSession', () => {
    const sessions = layout([Lower, '2026-11-05'], [Upper, '2026-11-07']);
    const change = {
      kind: MoveSession,
      sessionId: 's1',
      from: '2026-11-05',
      to: '2026-11-06',
    } as const;

    it('moves the Session to the new day with the same exercises', () => {
      const context = ctx(sessions);
      const applied = applyAdaptation(change, context);
      expect(applied).toEqual({
        block: null,
        supersedes: ['s1'],
        sessions: [
          {
            date: '2026-11-06',
            weekday: Weekday.Fri,
            focus: Lower,
            minutes: sessions[0]!.minutes,
            exercises: sessions[0]!.exercises,
            supersedes: 's1',
          },
        ],
      });
      expectNeverHarder(applied!, context);
    });

    it('answers null when the Session is not the current, unfinished, unstarted one', () => {
      expect(applyAdaptation({ ...change, sessionId: 'gone' }, ctx(sessions))).toBeNull();
      for (const patch of [
        { started: true },
        { finished: true },
        { started: true, finished: true },
      ]) {
        const done = sessions.map((s) => (s.id === 's1' ? { ...s, ...patch } : s));
        expect(applyAdaptation(change, ctx(done))).toBeNull();
      }
    });

    it('answers null when the Session is no longer on the day it was suggested for', () => {
      expect(applyAdaptation({ ...change, from: '2026-11-06' }, ctx(sessions))).toBeNull();
    });

    it('answers null when the day is taken, before today, or outside the week', () => {
      expect(applyAdaptation({ ...change, to: '2026-11-07' }, ctx(sessions))).toBeNull();
      expect(applyAdaptation({ ...change, to: '2026-11-03' }, ctx(sessions))).toBeNull();
      expect(applyAdaptation({ ...change, to: '2026-11-09' }, ctx(sessions))).toBeNull();
      expect(
        applyAdaptation({ ...change, to: '2026-11-04' }, ctx(sessions))?.sessions[0]?.weekday,
      ).toBe(Weekday.Wed);
    });
  });

  describe('SwapToRecovery', () => {
    const sessions = layout([Lower, '2026-11-05'], [Upper, '2026-11-07']);

    it('makes a Recovery Session on the same day with exercises from the Recovery slots', () => {
      const context = ctx(sessions);
      const revised = sessionOnly(
        applyAdaptation({ kind: SwapToRecovery, sessionId: 's1' }, context),
      );
      expect(revised).toMatchObject({ focus: Recovery, date: '2026-11-05', supersedes: 's1' });
      const slots = new Set(revised.exercises.map(({ slot }) => slot));
      expect([...slots]).toEqual([
        SessionSlot.WarmUp,
        SessionSlot.AccessoriesCore,
        SessionSlot.CoolDown,
      ]);
      const exercisesById = new Map(LIBRARY.map((e) => [e.id, e]));
      for (const exercise of revised.exercises) {
        expect(exercisesById.get(exercise.exerciseId)!.slots).toContain(exercise.slot);
      }
      expectNeverHarder({ block: null, supersedes: ['s1'], sessions: [revised] }, context);
    });

    it('prefers exercises the week does not use elsewhere', () => {
      const revised = sessionOnly(
        applyAdaptation({ kind: SwapToRecovery, sessionId: 's1' }, ctx(sessions)),
      );
      const elsewhere = new Set(sessions[1]!.exercises.map(({ exerciseId }) => exerciseId));
      const core = revised.exercises.filter(({ slot }) => slot === SessionSlot.AccessoriesCore);
      expect(core.some(({ exerciseId }) => !elsewhere.has(exerciseId))).toBe(true);
    });

    it('answers null when the library cannot fill a Recovery Session', () => {
      const generation: GenerationBasis = {
        ...PADEL_GENERATION,
        library: LIBRARY.filter((e) => !e.slots.includes(SessionSlot.AccessoriesCore)),
      };
      expect(
        applyAdaptation({ kind: SwapToRecovery, sessionId: 's1' }, ctx(sessions, { generation })),
      ).toBeNull();
    });

    it('answers null for a Session that is not revisable', () => {
      const done = sessions.map((s) => ({ ...s, started: true }));
      expect(applyAdaptation({ kind: SwapToRecovery, sessionId: 's1' }, ctx(done))).toBeNull();
    });
  });

  describe('DropSet', () => {
    it('takes one set off every exercise that has more than one', () => {
      const sessions = layout([Lower, '2026-11-05']);
      const context = ctx(sessions);
      const revised = sessionOnly(applyAdaptation({ kind: DropSet, sessionId: 's1' }, context));
      expect(revised.exercises.map(({ sets }) => sets)).toEqual(
        sessions[0]!.exercises.map(({ sets }) => Math.max(1, sets - 1)),
      );
      expect(revised.exercises.map(({ rir }) => rir)).toEqual(
        sessions[0]!.exercises.map(({ rir }) => rir),
      );
      expectNeverHarder({ block: null, supersedes: ['s1'], sessions: [revised] }, context);
    });

    it('answers null when every exercise has one set', () => {
      const flat = layout([Lower, '2026-11-05']).map((s) => ({
        ...s,
        exercises: s.exercises.map((e) => ({ ...e, sets: 1 })),
      }));
      expect(applyAdaptation({ kind: DropSet, sessionId: 's1' }, ctx(flat))).toBeNull();
    });
  });

  describe('LightenSession', () => {
    it('adds a rep in reserve to rated exercises and takes a set off, never below one', () => {
      const sessions = layout([Lower, '2026-11-05']);
      const context = ctx(sessions);
      const revised = sessionOnly(
        applyAdaptation({ kind: LightenSession, sessionId: 's1' }, context),
      );
      sessions[0]!.exercises.forEach((before, index) => {
        const after = revised.exercises[index]!;
        expect(after.exerciseId).toBe(before.exerciseId);
        expect(after.sets).toBe(Math.max(1, before.sets - 1));
        expect(after.rir).toBe(before.rir === null ? null : before.rir + 1);
      });
      expectNeverHarder({ block: null, supersedes: ['s1'], sessions: [revised] }, context);
    });

    it('never goes past the most reps in reserve', () => {
      const nearMax = layout([Lower, '2026-11-05']).map((s) => ({
        ...s,
        exercises: s.exercises.map((e) => ({ ...e, rir: e.rir === null ? null : MAX_RIR })),
      }));
      const revised = sessionOnly(
        applyAdaptation({ kind: LightenSession, sessionId: 's1' }, ctx(nearMax)),
      );
      expect(Math.max(...ratedRirs(revised.exercises))).toBe(MAX_RIR);
    });

    it('answers null when it would change nothing', () => {
      const flat = layout([Lower, '2026-11-05']).map((s) => ({
        ...s,
        exercises: s.exercises.map((e) => ({
          ...e,
          sets: 1,
          rir: e.rir === null ? null : MAX_RIR,
        })),
      }));
      expect(applyAdaptation({ kind: LightenSession, sessionId: 's1' }, ctx(flat))).toBeNull();
    });
  });

  describe('SwapExercises', () => {
    const sessions = layout([Lower, '2026-11-05'], [Upper, '2026-11-07']);
    const areas = [BodyArea.LowerBack, BodyArea.Hip, BodyArea.Knee];

    it('replaces every rated exercise that loads a targeted area, in the same slot, with one that does not', () => {
      const context = ctx(sessions);
      const revised = sessionOnly(
        applyAdaptation({ kind: SwapExercises, sessionId: 's1', areas }, context),
      );
      const before = sessions[0]!.exercises;
      const byId = new Map(LIBRARY.map((e) => [e.id, e]));
      expect(revised.exercises.map(({ slot }) => slot)).toEqual(before.map(({ slot }) => slot));
      revised.exercises.forEach((after, index) => {
        const old = before[index]!;
        const rated = old.slot !== SessionSlot.WarmUp && old.slot !== SessionSlot.CoolDown;
        const loaded = byId.get(old.exerciseId)!.highLoadAreas.some((a) => areas.includes(a));
        if (rated && loaded) {
          expect(after.exerciseId).not.toBe(old.exerciseId);
          expect(byId.get(after.exerciseId)!.highLoadAreas.some((a) => areas.includes(a))).toBe(
            false,
          );
        } else {
          expect(after).toEqual(old);
        }
      });
      expect(new Set(revised.exercises.map(({ exerciseId }) => exerciseId)).size).toBe(
        revised.exercises.length,
      );
      expectNeverHarder({ block: null, supersedes: ['s1'], sessions: [revised] }, context);
    });

    it('keeps the old exercise sets and reps, and rates a new one only when it can be rated', () => {
      const revised = sessionOnly(
        applyAdaptation({ kind: SwapExercises, sessionId: 's1', areas }, ctx(sessions)),
      );
      const before = sessions[0]!.exercises;
      revised.exercises.forEach((after, index) => {
        expect(after.sets).toBe(before[index]!.sets);
        expect(after.repMin).toBe(before[index]!.repMin);
        expect(after.repMax).toBe(before[index]!.repMax);
      });
    });

    it('answers null when an exercise cannot be replaced or none loads the areas', () => {
      const generation: GenerationBasis = {
        ...PADEL_GENERATION,
        library: LIBRARY.filter(({ id }) => id !== 'squat-4' && id !== 'hinge-4'),
      };
      expect(
        applyAdaptation(
          { kind: SwapExercises, sessionId: 's1', areas },
          ctx(sessions, { generation }),
        ),
      ).toBeNull();
      expect(
        applyAdaptation(
          { kind: SwapExercises, sessionId: 's1', areas: [BodyArea.Neck] },
          ctx(sessions),
        ),
      ).toBeNull();
    });

    it('does not use an excluded area for a replacement', () => {
      const generation: GenerationBasis = { ...PADEL_GENERATION, excludedAreas: [BodyArea.Ankle] };
      const revised = sessionOnly(
        applyAdaptation(
          { kind: SwapExercises, sessionId: 's1', areas },
          ctx(sessions, { generation }),
        ),
      );
      const byId = new Map(LIBRARY.map((e) => [e.id, e]));
      const replaced = revised.exercises.filter(
        (after, index) => after.exerciseId !== sessions[0]!.exercises[index]!.exerciseId,
      );
      expect(replaced.length).toBeGreaterThan(0);
      for (const { exerciseId } of replaced) {
        expect(byId.get(exerciseId)!.highLoadAreas).not.toContain(BodyArea.Ankle);
      }
    });
  });

  describe('DeloadWeek', () => {
    const sessions = layout([Upper, '2026-11-05'], [Lower, '2026-11-07']);

    it('halves the sets rounding up, never below one, and lifts reps in reserve to the Deload week', () => {
      const context = ctx(sessions);
      const applied = applyAdaptation({ kind: DeloadWeek, sessionIds: ['s1', 's2'] }, context)!;
      expect(applied.block).toBeNull();
      expect(applied.supersedes).toEqual(['s1', 's2']);
      applied.sessions.forEach((revised, index) => {
        const before = sessions[index]!;
        expect(revised).toMatchObject({
          date: before.date,
          focus: before.focus,
          supersedes: before.id,
        });
        revised.exercises.forEach((after, i) => {
          const old = before.exercises[i]!;
          expect(after.sets).toBe(Math.max(1, Math.ceil(old.sets / 2)));
          expect(after.rir).toBe(old.rir === null ? null : Math.max(old.rir, 4));
          expect(after.exerciseId).toBe(old.exerciseId);
        });
      });
      expect(applied.sessions[0]!.exercises.map(({ sets }) => sets)).toEqual([
        1, 1, 2, 2, 2, 2, 2, 2, 1,
      ]);
      expectNeverHarder(applied, context);
    });

    it('never lowers reps in reserve already above the Deload week', () => {
      const high = sessions.map((s) => ({
        ...s,
        exercises: s.exercises.map((e) => ({ ...e, rir: e.rir === null ? null : 5 })),
      }));
      const applied = applyAdaptation({ kind: DeloadWeek, sessionIds: ['s1'] }, ctx(high))!;
      expect(Math.min(...ratedRirs(applied.sessions[0]!.exercises))).toBe(5);
    });

    it('answers null when any named Session is not revisable', () => {
      const started = sessions.map((s) => (s.id === 's2' ? { ...s, started: true } : s));
      expect(
        applyAdaptation({ kind: DeloadWeek, sessionIds: ['s1', 's2'] }, ctx(started)),
      ).toBeNull();
      expect(
        applyAdaptation({ kind: DeloadWeek, sessionIds: ['s1', 'x'] }, ctx(sessions)),
      ).toBeNull();
      expect(applyAdaptation({ kind: DeloadWeek, sessionIds: [] }, ctx(sessions))).toBeNull();
    });
  });

  describe('RepeatWeek and RestartBlock', () => {
    const generation = BASKETBALL_GENERATION;
    const sessions = layout(
      [Upper, '2026-11-02'],
      [Lower, '2026-11-04'],
      [Upper, '2026-11-07'],
    ).map((s, index) => (index === 0 ? { ...s, started: true, finished: true } : s));
    const context = (overrides: Partial<AdaptationContext> = {}) =>
      ctx(sessions, { today: '2026-11-06', generation, weekInBlock: 2, ...overrides });
    const regenerated = (weekInBlock: number, rirBoost = 0, base = generation) =>
      generateWeek({ ...base, weekInBlock, startsOn: '2026-11-07', rirBoost })!;

    it('generates the same week again from tomorrow as a new Block, replacing the unfinished Sessions', () => {
      const applied = applyAdaptation(
        { kind: AdaptationChangeKind.RepeatWeek, startsOn: '2026-11-07', weekInBlock: 2 },
        context(),
      )!;
      const week = regenerated(2);
      expect(applied.block).toEqual({
        emphasis: week.emphasis,
        startsOn: '2026-11-07',
        weekInBlock: 2,
        limited: false,
      });
      expect(applied.supersedes).toEqual(['s2', 's3']);
      const expected: GeneratedSession[] = week.sessions;
      expect(applied.sessions).toEqual(expected.map((s) => ({ ...s, supersedes: null })));
    });

    it('does not replace a started Session', () => {
      const started = sessions.map((s) => (s.id === 's2' ? { ...s, started: true } : s));
      const applied = applyAdaptation(
        { kind: AdaptationChangeKind.RepeatWeek, startsOn: '2026-11-07', weekInBlock: 2 },
        context({ sessions: started }),
      )!;
      expect(applied.supersedes).toEqual(['s3']);
    });

    it('restarts at week 1 with one more rep in reserve on every rated exercise', () => {
      const applied = applyAdaptation(
        { kind: AdaptationChangeKind.RestartBlock, startsOn: '2026-11-07' },
        context(),
      )!;
      const plain = regenerated(1);
      const boosted = regenerated(1, RESTART_RIR_STEP);
      expect(applied.block).toMatchObject({ weekInBlock: 1, startsOn: '2026-11-07' });
      expect(applied.sessions).toEqual(boosted.sessions.map((s) => ({ ...s, supersedes: null })));
      boosted.sessions.forEach((session, index) =>
        session.exercises.forEach((exercise, i) => {
          const old = plain.sessions[index]!.exercises[i]!.rir;
          expect(exercise.rir).toBe(
            old === null ? null : Math.min(MAX_RIR, old + RESTART_RIR_STEP),
          );
          expect(exercise.sets).toBe(plain.sessions[index]!.exercises[i]!.sets);
        }),
      );
    });

    it('keeps a Limited person at least 3 reps from failure plus the boost', () => {
      const limited: GenerationBasis = { ...generation, mode: TrainingMode.Limited };
      const applied = applyAdaptation(
        { kind: AdaptationChangeKind.RestartBlock, startsOn: '2026-11-07' },
        context({ generation: limited }),
      )!;
      expect(applied.block?.limited).toBe(true);
      const rirs = applied.sessions.flatMap((s) => ratedRirs(s.exercises));
      expect(Math.min(...rirs)).toBe(3 + RESTART_RIR_STEP);
    });

    it('starts the week tomorrow even when it is accepted later: never in the past', () => {
      for (const change of [
        { kind: AdaptationChangeKind.RepeatWeek, startsOn: '2026-11-07', weekInBlock: 1 } as const,
        { kind: AdaptationChangeKind.RestartBlock, startsOn: '2026-11-07' } as const,
      ]) {
        const applied = applyAdaptation(change, context({ today: '2026-11-09' }))!;
        expect(applied.block?.startsOn).toBe('2026-11-10');
        expect(applied.sessions.every(({ date }) => date >= '2026-11-10')).toBe(true);
      }
    });

    it('answers null when nothing is left to replace or the week cannot be generated', () => {
      const done = sessions.map((s) => ({ ...s, started: true, finished: true }));
      expect(
        applyAdaptation(
          { kind: AdaptationChangeKind.RestartBlock, startsOn: '2026-11-07' },
          context({ sessions: done }),
        ),
      ).toBeNull();
      expect(
        applyAdaptation(
          { kind: AdaptationChangeKind.RepeatWeek, startsOn: '2026-11-07', weekInBlock: 1 },
          context({ generation: { ...generation, library: [] } }),
        ),
      ).toBeNull();
    });
  });
});

describe('never harder: every suggestion the rules raise, applied', () => {
  const days = Array.from({ length: 7 }, (_, index) => `2026-11-0${2 + index}`);
  const scenarios: [string, GenerationBasis][] = [
    ['padel', PADEL_GENERATION],
    ['basketball', BASKETBALL_GENERATION],
    ['limited padel', { ...PADEL_GENERATION, mode: TrainingMode.Limited }],
    ['excluded knee', { ...BASKETBALL_GENERATION, excludedAreas: [BodyArea.Knee] }],
  ];

  for (const [name, generation] of scenarios) {
    it(`${name}: Activities and Check-ins on every day against every Session day`, () => {
      let applied = 0;
      for (const today of days) {
        for (const focus of [Lower, Upper]) {
          for (const sessionDay of days.filter((day) => day >= today)) {
            const sessions = layout([focus, sessionDay], [Recovery, days[6]!]);
            for (const answers of [
              [1, 1, 1],
              [4, 2, 4],
              [5, 5, 5],
            ] as [number, number, number][]) {
              const context = adaptationContext({
                today,
                generation,
                sessions,
                activities: days
                  .filter((day) => day <= today)
                  .map((day) => activityFact(`a-${day}`, day)),
                checkins: [checkinFact('c1', today, answers)],
              });
              for (const proposal of proposeAdaptations(context)) {
                const result = applyAdaptation(proposal.change, context);
                expect(result, JSON.stringify(proposal)).not.toBeNull();
                expectNeverHarder(result!, context);
                applied += 1;
              }
            }
          }
        }
      }
      expect(applied).toBeGreaterThan(20);
    });
  }

  it('a Deload from Check-ins never adds a set or lowers a rep in reserve', () => {
    const context = adaptationContext({
      today: '2026-11-04',
      generation: BASKETBALL_GENERATION,
      sessions: layout([Upper, '2026-11-05'], [Lower, '2026-11-07']),
      checkins: ['2026-11-02', '2026-11-03', '2026-11-04'].map((date, index) =>
        checkinFact(`c${index}`, date, [1, 4, 1]),
      ),
    });
    const [proposal] = proposeAdaptations(context).filter(
      ({ ruleId }) => ruleId === AdaptationRule.DeloadCheckins,
    );
    expectNeverHarder(applyAdaptation(proposal!.change, context)!, context);
  });

  it('a good Check-in produces nothing at all', () => {
    for (const answers of [
      [5, 5, 5],
      [3, 3, 3],
      [3, 4, 5],
      [2, 3, 3],
      [3, 3, 2],
    ] as [number, number, number][]) {
      const context = adaptationContext({
        today: '2026-11-07',
        sessions: layout([Lower, '2026-11-07']),
        checkins: [checkinFact('c1', '2026-11-07', answers)],
      });
      expect(proposeAdaptations(context)).toEqual([]);
    }
  });

  it('week of finished work for effort Deload is not harder either', () => {
    const context = adaptationContext({
      today: '2026-11-04',
      generation: BASKETBALL_GENERATION,
      sessions: layout([Upper, '2026-11-05'], [Lower, '2026-11-07']),
      finished: [finishedFact('2026-11-01', 9, 3), finishedFact('2026-11-02', 9, 3)],
    });
    const [proposal] = proposeAdaptations(context);
    expect(proposal?.ruleId).toBe(AdaptationRule.DeloadEffort);
    expectNeverHarder(applyAdaptation(proposal!.change, context)!, context);
  });
});
