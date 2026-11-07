import { describe, expect, it } from 'vitest';
import { ADAPTATION_REASK_DAYS, MS_PER_DAY } from '../config.ts';
import { AdaptationChangeKind } from '../enums/adaptation-change-kind.ts';
import { AdaptationRule } from '../enums/adaptation-rule.ts';
import { AdaptationStatus } from '../enums/adaptation-status.ts';
import { BodyArea } from '../enums/body-area.ts';
import { Intensity } from '../enums/intensity.ts';
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
  programSessions,
  WEEK_START,
} from '../testing/adaptation-fixtures.ts';
import type {
  AdaptationContext,
  AdaptationHistoryEntry,
  AdaptationProposal,
  GenerationBasis,
} from '../types.ts';
import { proposeAdaptations } from './propose-adaptations.ts';

const { Lower, Upper, Recovery } = SessionFocus;

/** Padel with only Tuesday hard and every day available, so a move has somewhere to go. */
const TUE_HARD: GenerationBasis = {
  ...PADEL_GENERATION,
  playDays: [Weekday.Tue],
  trainingWeek: { ...PADEL_GENERATION.trainingWeek, availableDays: Object.values(Weekday) },
};
const withoutSlot = (generation: GenerationBasis, slot: SessionSlot): GenerationBasis => ({
  ...generation,
  library: LIBRARY.filter((exercise) => !exercise.slots.includes(slot)),
});

const ofRule = (proposals: AdaptationProposal[], ...rules: AdaptationRule[]) =>
  proposals.filter(({ ruleId }) => rules.includes(ruleId));
const history = (
  ruleId: AdaptationRule,
  triggerKey: string,
  status = AdaptationStatus.Pending,
  extra: Partial<AdaptationHistoryEntry> = {},
): AdaptationHistoryEntry => ({
  ruleId,
  triggerKey,
  ask: 1,
  status,
  decidedAt: status === AdaptationStatus.Pending ? null : '2026-11-01T12:00:00.000Z',
  basis: [],
  validUntil: null,
  ...extra,
});

describe('proposeAdaptations: UnplannedActivity', () => {
  /** Wed 2026-11-04: an unplanned hard match. Tue is the only planned hard day (windows: lower 48 h, upper 24 h). */
  const wed = (overrides: Partial<AdaptationContext>): AdaptationContext =>
    adaptationContext({
      today: '2026-11-04',
      generation: TUE_HARD,
      activities: [activityFact('a1', '2026-11-04')],
      ...overrides,
    });
  const only = (context: AdaptationContext) => {
    const proposals = ofRule(proposeAdaptations(context), AdaptationRule.UnplannedActivity);
    expect(proposals.length).toBeLessThanOrEqual(1);
    return proposals[0];
  };

  it('moves the next heavy Session to the day after, with the reason in numbers', () => {
    const sessions = layout([Upper, '2026-11-05']);
    expect(only(wed({ sessions }))).toEqual({
      ruleId: AdaptationRule.UnplannedActivity,
      triggerKey: 'a1',
      ask: 1,
      change: {
        kind: AdaptationChangeKind.MoveSession,
        sessionId: 's1',
        from: '2026-11-05',
        to: '2026-11-06',
      },
      params: { load: 720, minutes: 90, hours: 24, windowHours: 24 },
      basis: [{ sessionId: 's1', revision: 1 }],
      validUntil: '2026-11-05',
    });
  });

  it('uses the upper window for an upper Session: 24 h is inside, 48 h is not', () => {
    expect(only(wed({ sessions: layout([Upper, '2026-11-05']) }))).toBeDefined();
    expect(only(wed({ sessions: layout([Upper, '2026-11-06']) }))).toBeUndefined();
  });

  it('uses the lower window for a lower Session: 48 h is inside, 72 h is not', () => {
    const inside = only(wed({ sessions: layout([Lower, '2026-11-06']) }));
    expect(inside?.params.hours).toBe(48);
    expect(inside?.change).toMatchObject({
      kind: AdaptationChangeKind.MoveSession,
      to: '2026-11-07',
    });
    expect(only(wed({ sessions: layout([Lower, '2026-11-07']) }))).toBeUndefined();
  });

  it('looks at the next heavy Session only, and ignores Recovery, started and finished ones', () => {
    const sessions = layout([Recovery, '2026-11-04'], [Upper, '2026-11-05'], [Lower, '2026-11-07']);
    const proposal = only(wed({ sessions }));
    expect(proposal?.basis).toEqual([{ sessionId: 's2', revision: 1 }]);

    const started = sessions.map((session) =>
      session.id === 's2' ? { ...session, started: true } : session,
    );
    // The next heavy Session is now the lower one on Sat, 72 h away: outside its window.
    expect(only(wed({ sessions: started }))).toBeUndefined();
    const finished = sessions.map((session) =>
      session.id === 's2' ? { ...session, started: true, finished: true } : session,
    );
    expect(only(wed({ sessions: finished }))).toBeUndefined();
  });

  it('swaps to a Recovery Session when the day after is inside the window and the day before is the Activity', () => {
    // Lower Thu: Fri is 48 h from Wed, not clear of a 48 h window (the boundary); Wed is the Activity's day.
    const proposal = only(wed({ sessions: layout([Lower, '2026-11-05']) }));
    expect(proposal?.change).toEqual({
      kind: AdaptationChangeKind.SwapToRecovery,
      sessionId: 's1',
    });
    expect(proposal?.params).toEqual({ load: 720, minutes: 90, hours: 24, windowHours: 48 });
  });

  it('never moves a Session earlier than the Activity (the day before is never clear of its window)', () => {
    const sessions = layout([Upper, '2026-11-05']);
    const proposal = only(
      wed({ sessions, generation: { ...TUE_HARD, playDays: [Weekday.Thu, Weekday.Fri] } }),
    );
    expect(proposal?.change.kind).toBe(AdaptationChangeKind.SwapToRecovery);
  });

  it('does not move onto the window before the next planned hard Activity', () => {
    const sessions = layout([Upper, '2026-11-05']);
    // Hard Sun: Fri is 48 h from Wed and 48 h before Sun: clear of the 24 h window.
    const clear = only(wed({ sessions, generation: { ...TUE_HARD, playDays: [Weekday.Sun] } }));
    expect(clear?.change).toMatchObject({
      kind: AdaptationChangeKind.MoveSession,
      to: '2026-11-06',
    });
    // Hard Sat: Fri is the day before it, 24 h is not clear of a 24 h window.
    const blocked = only(wed({ sessions, generation: { ...TUE_HARD, playDays: [Weekday.Sat] } }));
    expect(blocked?.change.kind).toBe(AdaptationChangeKind.SwapToRecovery);
  });

  it('does not move onto a planned hard day, a day with a Session, a day the person cannot train, or past the week', () => {
    const upperThu = layout([Upper, '2026-11-05']);
    const hardFri = { ...TUE_HARD, playDays: [Weekday.Fri] };
    expect(only(wed({ sessions: upperThu, generation: hardFri }))?.change.kind).toBe(
      AdaptationChangeKind.SwapToRecovery,
    );
    const occupied = layout([Upper, '2026-11-05'], [Recovery, '2026-11-06']);
    expect(only(wed({ sessions: occupied }))?.change.kind).toBe(
      AdaptationChangeKind.SwapToRecovery,
    );
    const noFriday = {
      ...TUE_HARD,
      trainingWeek: {
        ...TUE_HARD.trainingWeek,
        availableDays: Object.values(Weekday).filter((day) => day !== Weekday.Fri),
      },
    };
    expect(only(wed({ sessions: upperThu, generation: noFriday }))?.change.kind).toBe(
      AdaptationChangeKind.SwapToRecovery,
    );
    const sunday = adaptationContext({
      today: '2026-11-08',
      generation: TUE_HARD,
      activities: [activityFact('a1', '2026-11-08')],
      sessions: layout([Upper, '2026-11-08']),
    });
    expect(only(sunday)?.change.kind).toBe(AdaptationChangeKind.SwapToRecovery);
  });

  it('does not move onto the day of a hard Activity already logged', () => {
    const sessions = layout([Upper, '2026-11-05']);
    const activities = [
      activityFact('a1', '2026-11-04'),
      activityFact('a2', '2026-11-06', { planned: true }),
    ];
    const proposals = ofRule(
      proposeAdaptations(wed({ sessions, activities })),
      AdaptationRule.UnplannedActivity,
    );
    expect(proposals.map(({ triggerKey, change }) => [triggerKey, change.kind])).toEqual([
      ['a1', AdaptationChangeKind.SwapToRecovery],
    ]);
  });

  it('drops a set when neither a move nor a Recovery Session fits', () => {
    const generation = withoutSlot(PADEL_GENERATION, SessionSlot.AccessoriesCore);
    const proposal = only(wed({ sessions: layout([Lower, '2026-11-05']), generation }));
    expect(proposal?.change).toEqual({ kind: AdaptationChangeKind.DropSet, sessionId: 's1' });
  });

  it('suggests nothing when no set can be dropped either', () => {
    const generation = withoutSlot(PADEL_GENERATION, SessionSlot.AccessoriesCore);
    const sessions = layout([Lower, '2026-11-05']).map((session) => ({
      ...session,
      exercises: session.exercises.map((exercise) => ({ ...exercise, sets: 1 })),
    }));
    expect(only(wed({ sessions, generation }))).toBeUndefined();
  });

  it('ignores planned, easy and moderate Activities', () => {
    const sessions = layout([Upper, '2026-11-05']);
    for (const activity of [
      activityFact('a1', '2026-11-04', { planned: true }),
      activityFact('a1', '2026-11-04', { intensity: Intensity.Moderate }),
      activityFact('a1', '2026-11-04', { intensity: Intensity.Easy }),
    ]) {
      expect(only(wed({ sessions, activities: [activity] }))).toBeUndefined();
    }
  });

  it('counts Activities up to 14 days old, not 15', () => {
    const generation: GenerationBasis = {
      ...TUE_HARD,
      sport: { ...PADEL_GENERATION.sport!, recoveryWindowHours: { lower: 720, upper: 720 } },
    };
    const sessions = layout([Upper, '2026-11-06']);
    const at = (date: string) =>
      only(
        adaptationContext({
          today: '2026-11-06',
          generation,
          sessions,
          activities: [activityFact('a1', date)],
        }),
      );
    expect(at('2026-10-23')).toBeDefined();
    expect(at('2026-10-22')).toBeUndefined();
  });

  it('raises an Activity once, whatever became of the first suggestion', () => {
    const sessions = layout([Upper, '2026-11-05']);
    for (const status of Object.values(AdaptationStatus)) {
      const stored = [history(AdaptationRule.UnplannedActivity, 'a1', status)];
      expect(only(wed({ sessions, history: stored }))).toBeUndefined();
    }
    // Another Activity is a different trigger.
    const other = [history(AdaptationRule.UnplannedActivity, 'a0')];
    expect(only(wed({ sessions, history: other }))).toBeDefined();
  });

  it('raises one suggestion per Activity, oldest first', () => {
    const sessions = layout([Upper, '2026-11-05']);
    const activities = [activityFact('b', '2026-11-04'), activityFact('a', '2026-11-04')];
    const proposals = ofRule(
      proposeAdaptations(wed({ sessions, activities })),
      AdaptationRule.UnplannedActivity,
    );
    expect(proposals.map(({ triggerKey }) => triggerKey)).toEqual(['a', 'b']);
  });

  it('measures from today for an Activity from earlier in the week', () => {
    // Mon's match, Wed Session already past the window of Mon but today is Wed: next heavy is Wed (48 h from Mon).
    const context = adaptationContext({
      today: '2026-11-04',
      generation: TUE_HARD,
      activities: [activityFact('a1', '2026-11-02')],
      sessions: layout([Lower, '2026-11-04']),
    });
    expect(only(context)?.params.hours).toBe(48);
  });
});

describe('proposeAdaptations: PoorCheckin', () => {
  const sat = '2026-11-07';
  const ctx = (answers: [number, number, number], overrides: Partial<AdaptationContext> = {}) =>
    adaptationContext({
      today: sat,
      sessions: layout([Lower, sat]),
      checkins: [checkinFact('c1', sat, answers)],
      ...overrides,
    });
  const only = (context: AdaptationContext) =>
    ofRule(proposeAdaptations(context), AdaptationRule.PoorCheckin)[0];

  it('lightens the heavy Session of the day on a poor Check-in', () => {
    expect(only(ctx([2, 4, 2]))).toEqual({
      ruleId: AdaptationRule.PoorCheckin,
      triggerKey: 'c1',
      ask: 1,
      change: { kind: AdaptationChangeKind.LightenSession, sessionId: 's1' },
      params: { sleep: 2, soreness: 4, energy: 2 },
      basis: [{ sessionId: 's1', revision: 1 }],
      validUntil: sat,
    });
  });

  it('needs two low answers: 2 or less counts, 3 does not', () => {
    expect(only(ctx([2, 3, 3]))).toBeUndefined();
    expect(only(ctx([3, 3, 3]))).toBeUndefined();
    expect(only(ctx([5, 5, 5]))).toBeUndefined();
    expect(only(ctx([2, 2, 5]))).toBeDefined();
    expect(only(ctx([5, 1, 2]))).toBeDefined();
    expect(only(ctx([1, 1, 1]))).toBeDefined();
  });

  it('suggests nothing for a Check-in on a day with no heavy Session', () => {
    expect(only(ctx([1, 1, 1], { sessions: layout([Lower, '2026-11-08']) }))).toBeUndefined();
    expect(only(ctx([1, 1, 1], { sessions: layout([Recovery, sat]) }))).toBeUndefined();
  });

  it('suggests nothing when the Session is started or finished', () => {
    const [session] = layout([Lower, sat]);
    expect(only(ctx([1, 1, 1], { sessions: [{ ...session!, started: true }] }))).toBeUndefined();
  });

  it('swaps to a Recovery Session when lightening changes nothing', () => {
    const [session] = layout([Lower, sat]);
    const flat = {
      ...session!,
      exercises: session!.exercises.map((exercise) => ({
        ...exercise,
        sets: 1,
        rir: exercise.rir === null ? null : 5,
      })),
    };
    expect(only(ctx([1, 1, 1], { sessions: [flat] }))?.change).toEqual({
      kind: AdaptationChangeKind.SwapToRecovery,
      sessionId: 's1',
    });
    const generation = withoutSlot(PADEL_GENERATION, SessionSlot.AccessoriesCore);
    expect(only(ctx([1, 1, 1], { sessions: [flat], generation }))).toBeUndefined();
  });

  it('is raised once per Check-in', () => {
    for (const status of Object.values(AdaptationStatus)) {
      const stored = [history(AdaptationRule.PoorCheckin, 'c1', status)];
      expect(only(ctx([1, 1, 1], { history: stored }))).toBeUndefined();
    }
  });
});

describe('proposeAdaptations: SoreArea', () => {
  const sat = '2026-11-07';
  const ctx = (
    answers: [number, number, number],
    sessions = layout([Lower, sat]),
    overrides: Partial<AdaptationContext> = {},
  ) =>
    adaptationContext({
      today: sat,
      sessions,
      checkins: [checkinFact('c1', sat, answers)],
      ...overrides,
    });
  const only = (context: AdaptationContext) =>
    ofRule(proposeAdaptations(context), AdaptationRule.SoreArea)[0];

  it('swaps the exercises that load the areas the Session targets', () => {
    expect(only(ctx([4, 2, 4]))).toEqual({
      ruleId: AdaptationRule.SoreArea,
      triggerKey: 'c1',
      ask: 1,
      change: {
        kind: AdaptationChangeKind.SwapExercises,
        sessionId: 's1',
        areas: [BodyArea.LowerBack, BodyArea.Hip, BodyArea.Knee],
      },
      params: { soreness: 2 },
      basis: [{ sessionId: 's1', revision: 1 }],
      validUntil: sat,
    });
  });

  it('targets the upper body areas for an upper Session', () => {
    expect(only(ctx([4, 1, 4], layout([Upper, sat])))?.change).toMatchObject({
      areas: [BodyArea.Shoulder, BodyArea.Elbow, BodyArea.UpperBack],
    });
  });

  it('needs soreness of 2 or less', () => {
    expect(only(ctx([4, 3, 4]))).toBeUndefined();
    expect(only(ctx([4, 2, 4]))).toBeDefined();
    expect(only(ctx([4, 1, 4]))).toBeDefined();
  });

  it('is not raised when the Check-in is poor: the poor-Check-in rule wins', () => {
    const proposals = proposeAdaptations(ctx([2, 2, 4]));
    expect(proposals.map(({ ruleId }) => ruleId)).toEqual([AdaptationRule.PoorCheckin]);
  });

  it('lightens the Session instead when an exercise cannot be replaced, never a half Session', () => {
    const generation: GenerationBasis = {
      ...PADEL_GENERATION,
      library: LIBRARY.filter(({ id }) => id !== 'squat-4' && id !== 'hinge-4'),
    };
    expect(only(ctx([4, 2, 4], undefined, { generation }))).toMatchObject({
      change: { kind: AdaptationChangeKind.LightenSession, sessionId: 's1' },
      params: { soreness: 2 },
    });
  });

  it('suggests nothing for a Recovery Session (it targets no area)', () => {
    expect(only(ctx([4, 2, 4], layout([Recovery, sat])))).toBeUndefined();
  });

  it('is raised once per Check-in', () => {
    for (const status of Object.values(AdaptationStatus)) {
      const stored = [history(AdaptationRule.SoreArea, 'c1', status)];
      expect(only(ctx([4, 2, 4], undefined, { history: stored }))).toBeUndefined();
    }
  });
});

describe('proposeAdaptations: early Deload', () => {
  const deloads = (context: AdaptationContext) =>
    ofRule(
      proposeAdaptations(context),
      AdaptationRule.DeloadLoad,
      AdaptationRule.DeloadCheckins,
      AdaptationRule.DeloadEffort,
    );
  /** Program from Mon 2026-10-05; today Wed 2026-11-04 in the week from Mon 2026-11-02, Sessions Fri and Sun still to do. */
  const ctx = (overrides: Partial<AdaptationContext> = {}): AdaptationContext =>
    adaptationContext({
      today: '2026-11-04',
      generation: BASKETBALL_GENERATION,
      programStartsOn: '2026-10-05',
      sessions: layout([Upper, '2026-11-06'], [Lower, '2026-11-08']),
      ...overrides,
    });
  const WEEK_END = '2026-11-08';

  describe('on Load', () => {
    /** Three weeks of 100, then last week (10-26) and this one at the given Loads. */
    const loads = (lastWeek: number, thisWeek: number) => [
      { date: '2026-10-05', load: 100 },
      { date: '2026-10-12', load: 100 },
      { date: '2026-10-19', load: 100 },
      { date: '2026-10-26', load: lastWeek },
      { date: '2026-11-03', load: thisWeek },
    ];

    it('suggests a Deload when this week and last are above 1.3 times the average', () => {
      const [proposal] = deloads(ctx({ loadEntries: loads(131, 131) }));
      expect(proposal).toEqual({
        ruleId: AdaptationRule.DeloadLoad,
        triggerKey: '2026-11-02',
        ask: 1,
        change: { kind: AdaptationChangeKind.DeloadWeek, sessionIds: ['s1', 's2'] },
        params: { load: 131, previousLoad: 131, average: 100, percent: 130 },
        basis: [
          { sessionId: 's1', revision: 1 },
          { sessionId: 's2', revision: 1 },
        ],
        validUntil: WEEK_END,
      });
    });

    it('needs both weeks strictly above the limit: exactly 1.3 times is not enough', () => {
      expect(deloads(ctx({ loadEntries: loads(130, 131) }))).toEqual([]);
      expect(deloads(ctx({ loadEntries: loads(131, 130) }))).toEqual([]);
      expect(deloads(ctx({ loadEntries: loads(131, 131) }))).toHaveLength(1);
    });

    it('needs an average to compare against', () => {
      const entries = [
        { date: '2026-10-26', load: 500 },
        { date: '2026-11-03', load: 500 },
      ];
      expect(deloads(ctx({ loadEntries: entries }))).toEqual([]);
    });
  });

  describe('on Check-ins', () => {
    const poor = (...dates: string[]) =>
      dates.map((date, index) => checkinFact(`c${index}`, date, [1, 4, 1]));

    it('suggests a Deload for three poor Check-ins on different days within 5 days', () => {
      const checkins = poor('2026-10-31', '2026-11-02', '2026-11-04');
      const [proposal] = deloads(ctx({ checkins }));
      expect(proposal).toMatchObject({
        ruleId: AdaptationRule.DeloadCheckins,
        triggerKey: '2026-11-02',
        change: { kind: AdaptationChangeKind.DeloadWeek },
        params: { count: 3, days: 5 },
        validUntil: WEEK_END,
      });
    });

    it('counts 5 days with today included, not 6', () => {
      expect(
        deloads(ctx({ checkins: poor('2026-10-31', '2026-11-02', '2026-11-04') })),
      ).toHaveLength(1);
      expect(deloads(ctx({ checkins: poor('2026-10-30', '2026-11-02', '2026-11-04') }))).toEqual(
        [],
      );
    });

    it('counts different days, and only poor Check-ins', () => {
      const sameDay = [
        ...poor('2026-11-03', '2026-11-04'),
        checkinFact('x', '2026-11-04', [1, 1, 1]),
      ];
      expect(deloads(ctx({ checkins: sameDay }))).toEqual([]);
      const good = [...poor('2026-11-02', '2026-11-03'), checkinFact('g', '2026-11-04', [3, 3, 3])];
      expect(deloads(ctx({ checkins: good }))).toEqual([]);
    });
  });

  describe('on effort', () => {
    it('suggests a Deload when the last two rated Sessions were 2 RPE above target', () => {
      // Lowest RIR 3 means target RPE 7: RPE 9 is target + 2.
      const finished = [finishedFact('2026-11-01', 9, 3), finishedFact('2026-11-02', 9, 3)];
      const [proposal] = deloads(ctx({ finished }));
      expect(proposal).toMatchObject({
        ruleId: AdaptationRule.DeloadEffort,
        params: { sessions: 2, margin: 2 },
      });
    });

    it('needs both at the margin or above', () => {
      const finished = [finishedFact('2026-11-01', 8, 3), finishedFact('2026-11-02', 9, 3)];
      expect(deloads(ctx({ finished }))).toEqual([]);
      expect(deloads(ctx({ finished: [finishedFact('2026-11-02', 10, 3)] }))).toEqual([]);
    });

    it('reads the last two by finish order and skips Sessions that rated nothing', () => {
      const old = finishedFact('2026-10-20', 5, 3);
      const hard = [finishedFact('2026-10-30', 9, 3), finishedFact('2026-11-02', 10, 2)];
      const unrated = finishedFact('2026-11-03', 3, null);
      expect(deloads(ctx({ finished: [old, ...hard, unrated] }))).toHaveLength(1);
      const easyLast = [...hard, finishedFact('2026-11-03', 6, 3)];
      expect(deloads(ctx({ finished: easyLast }))).toEqual([]);
    });
  });

  it('prefers Load over Check-ins over effort', () => {
    const entries = [
      { date: '2026-10-05', load: 100 },
      { date: '2026-10-12', load: 100 },
      { date: '2026-10-19', load: 100 },
      { date: '2026-10-26', load: 200 },
      { date: '2026-11-03', load: 200 },
    ];
    const checkins = ['2026-11-02', '2026-11-03', '2026-11-04'].map((date, index) =>
      checkinFact(`c${index}`, date, [1, 4, 1]),
    );
    const finished = [finishedFact('2026-11-01', 9, 3), finishedFact('2026-11-02', 9, 3)];
    expect(deloads(ctx({ loadEntries: entries, checkins, finished })).map((p) => p.ruleId)).toEqual(
      [AdaptationRule.DeloadLoad],
    );
    expect(deloads(ctx({ checkins, finished })).map((p) => p.ruleId)).toEqual([
      AdaptationRule.DeloadCheckins,
    ]);
  });

  it('suggests nothing in the Deload week or with no Session left to lighten', () => {
    const finished = [finishedFact('2026-11-01', 9, 3), finishedFact('2026-11-02', 9, 3)];
    expect(deloads(ctx({ finished, weekInBlock: 4 }))).toEqual([]);
    expect(deloads(ctx({ finished, sessions: layout([Upper, '2026-11-03']) }))).toEqual([]);
    expect(deloads(ctx({ finished }))).toHaveLength(1);
  });

  it('only lightens the Sessions nothing was done in', () => {
    const finished = [finishedFact('2026-11-01', 9, 3), finishedFact('2026-11-02', 9, 3)];
    const sessions = layout(
      [Upper, '2026-11-05'],
      [Lower, '2026-11-06'],
      [Upper, '2026-11-07'],
    ).map((session, index) =>
      index === 0
        ? { ...session, started: true }
        : index === 1
          ? { ...session, finished: true }
          : session,
    );
    const [proposal] = deloads(ctx({ finished, sessions }));
    expect(proposal?.change).toEqual({ kind: AdaptationChangeKind.DeloadWeek, sessionIds: ['s3'] });
  });

  describe('being asked again', () => {
    const finished = [finishedFact('2026-11-01', 9, 3), finishedFact('2026-11-02', 9, 3)];
    const declined = (ask = 1) =>
      history(AdaptationRule.DeloadEffort, '2026-11-02', AdaptationStatus.Declined, {
        ask,
        decidedAt: '2026-11-01T12:00:00.000Z',
      });
    const at = (now: string, stored: AdaptationHistoryEntry[]) =>
      deloads(ctx({ finished, history: stored, now }));
    const DECIDED = Date.parse('2026-11-01T12:00:00.000Z');
    const after = (days: number, extraMs = 0) =>
      new Date(DECIDED + days * MS_PER_DAY + extraMs).toISOString();

    it('is not raised again within 3 days of a decline, and is at exactly 3', () => {
      expect(ADAPTATION_REASK_DAYS).toBe(3);
      expect(at(after(3, -1), [declined()])).toEqual([]);
      const [again] = at(after(3), [declined()]);
      expect(again).toMatchObject({ ruleId: AdaptationRule.DeloadEffort, ask: 2 });
    });

    it('is asked again with the next ask number each time', () => {
      expect(at(after(10), [declined(1), declined(2)])[0]?.ask).toBe(3);
    });

    it('is not asked again when the reason no longer holds', () => {
      const easier = [finishedFact('2026-11-01', 9, 3), finishedFact('2026-11-02', 7, 3)];
      expect(deloads(ctx({ finished: easier, history: [declined()], now: after(10) }))).toEqual([]);
    });

    it('is never asked again while pending or once accepted', () => {
      for (const status of [AdaptationStatus.Pending, AdaptationStatus.Accepted]) {
        const stored = [history(AdaptationRule.DeloadEffort, '2026-11-02', status)];
        expect(at(after(30), stored)).toEqual([]);
        // The week already has a Deload: another reason does not stack a second one.
        const checkins = ['2026-11-02', '2026-11-03', '2026-11-04'].map((date, index) =>
          checkinFact(`c${index}`, date, [1, 4, 1]),
        );
        expect(deloads(ctx({ checkins, history: stored, now: after(30) }))).toEqual([]);
      }
    });

    it('is asked again at once when the Sessions a pending one was raised on moved on', () => {
      const pending = (
        basis: { sessionId: string; revision: number }[],
        validUntil: string | null,
      ) =>
        history(AdaptationRule.DeloadEffort, '2026-11-02', AdaptationStatus.Pending, {
          basis,
          validUntil,
        });
      // Another suggestion revised s1, so the pending Deload can no longer be accepted.
      expect(at(after(0), [pending([{ sessionId: 's1', revision: 2 }], null)])[0]?.ask).toBe(2);
      // Its last day passed.
      expect(at(after(0), [pending([], '2026-11-01')])[0]?.ask).toBe(2);
      // Still current: not asked again.
      expect(at(after(0), [pending([{ sessionId: 's1', revision: 1 }], null)])).toEqual([]);
    });

    it('is a different Deload in another week', () => {
      const lastWeek = [
        history(AdaptationRule.DeloadEffort, '2026-10-26', AdaptationStatus.Accepted),
      ];
      expect(at(after(0), lastWeek)).toHaveLength(1);
    });
  });
});

describe('proposeAdaptations: missed Sessions', () => {
  const missed = (overrides: Partial<AdaptationContext> = {}) =>
    ofRule(
      proposeAdaptations(
        adaptationContext({
          today: '2026-11-06',
          generation: BASKETBALL_GENERATION,
          sessions: layout([Upper, '2026-11-02'], [Lower, '2026-11-04'], [Recovery, '2026-11-07']),
          ...overrides,
        }),
      ),
      AdaptationRule.RepeatWeek,
      AdaptationRule.RestartBlock,
    );

  it('repeats the week from tomorrow when two Sessions were missed', () => {
    expect(missed()).toEqual([
      {
        ruleId: AdaptationRule.RepeatWeek,
        triggerKey: WEEK_START,
        ask: 1,
        change: { kind: AdaptationChangeKind.RepeatWeek, startsOn: '2026-11-07', weekInBlock: 1 },
        params: { missed: 2, weekInBlock: 1 },
        basis: [
          { sessionId: 's1', revision: 1 },
          { sessionId: 's2', revision: 1 },
          { sessionId: 's3', revision: 1 },
        ],
        validUntil: null,
      },
    ]);
  });

  it('carries the week of the Block it repeats', () => {
    const [proposal] = missed({ weekInBlock: 3 });
    expect(proposal?.change).toMatchObject({ weekInBlock: 3 });
    expect(proposal?.params).toEqual({ missed: 2, weekInBlock: 3 });
  });

  it('skips a single missed Session without a suggestion', () => {
    const sessions = layout([Upper, '2026-11-02'], [Lower, '2026-11-06'], [Recovery, '2026-11-07']);
    expect(missed({ sessions })).toEqual([]);
    const oneDone = layout([Upper, '2026-11-02'], [Lower, '2026-11-04']).map((session, index) =>
      index === 0 ? { ...session, started: true, finished: true } : session,
    );
    expect(missed({ sessions: oneDone, finished: [finishedFact('2026-11-02', 7, 3)] })).toEqual([]);
  });

  it('replaces only the Sessions nothing was done in, and needs one', () => {
    const sessions = layout([Upper, '2026-11-02'], [Lower, '2026-11-04'], [Recovery, '2026-11-07']);
    const started = sessions.map((session) =>
      session.id === 's1' ? { ...session, started: true } : session,
    );
    const [proposal] = missed({ sessions: started });
    expect(proposal?.params).toEqual({ missed: 2, weekInBlock: 1 });
    expect(proposal?.basis).toEqual([
      { sessionId: 's2', revision: 1 },
      { sessionId: 's3', revision: 1 },
    ]);
    expect(
      missed({ sessions: sessions.map((session) => ({ ...session, started: true })) }),
    ).toEqual([]);
  });

  it('is asked again at once when the Sessions it was raised on moved on, never when decided', () => {
    const moved = history(AdaptationRule.RepeatWeek, WEEK_START, AdaptationStatus.Pending, {
      basis: [{ sessionId: 's1', revision: 2 }],
    });
    expect(missed({ history: [moved] })[0]).toMatchObject({ ask: 2 });
    const declined = history(AdaptationRule.RepeatWeek, WEEK_START, AdaptationStatus.Declined);
    expect(missed({ history: [moved, declined] })).toEqual([]);
  });

  it('counts only Sessions dated before today', () => {
    const sessions = layout([Upper, '2026-11-02'], [Lower, '2026-11-06'], [Recovery, '2026-11-07']);
    expect(missed({ sessions, today: '2026-11-07' })).toHaveLength(1);
  });

  it('is raised once per week, whatever became of it', () => {
    for (const status of Object.values(AdaptationStatus)) {
      expect(missed({ history: [history(AdaptationRule.RepeatWeek, WEEK_START, status)] })).toEqual(
        [],
      );
    }
  });

  describe('after 14 days without a finished Session', () => {
    /** The week's Sessions are all still ahead, so only the days off can speak. */
    const sessions = layout([Upper, '2026-11-06'], [Lower, '2026-11-08']);
    const off = (today: string, extra: Partial<AdaptationContext> = {}) =>
      missed({
        today,
        sessions,
        finished: [finishedFact('2026-10-23', 7, 3)],
        ...extra,
      });

    it('restarts the Block from tomorrow at exactly 14 days, not at 13', () => {
      expect(off('2026-11-05')).toEqual([]);
      expect(off('2026-11-06')).toEqual([
        {
          ruleId: AdaptationRule.RestartBlock,
          triggerKey: '2026-10-23',
          ask: 1,
          change: { kind: AdaptationChangeKind.RestartBlock, startsOn: '2026-11-07' },
          params: { daysOff: 14 },
          basis: [
            { sessionId: 's1', revision: 1 },
            { sessionId: 's2', revision: 1 },
          ],
          validUntil: null,
        },
      ]);
    });

    it('counts from the Program start while nothing was ever finished', () => {
      const context = (today: string) =>
        missed({ today, sessions, programStartsOn: '2026-10-23', finished: [] });
      expect(context('2026-11-05')).toEqual([]);
      expect(context('2026-11-06')[0]).toMatchObject({
        ruleId: AdaptationRule.RestartBlock,
        triggerKey: '2026-10-23',
      });
    });

    it('measures from the latest finished Session', () => {
      const finished = [finishedFact('2026-10-10', 7, 3), finishedFact('2026-11-01', 7, 3)];
      expect(off('2026-11-06', { finished })).toEqual([]);
    });

    it('wins over repeating the week', () => {
      const behind = layout([Upper, '2026-11-02'], [Lower, '2026-11-04']);
      const [proposal, ...rest] = off('2026-11-06', { sessions: behind });
      expect(proposal?.ruleId).toBe(AdaptationRule.RestartBlock);
      expect(rest).toEqual([]);
    });

    it('is raised once and then nothing else (not even a repeat)', () => {
      const behind = layout([Upper, '2026-11-02'], [Lower, '2026-11-04']);
      for (const status of Object.values(AdaptationStatus)) {
        const stored = [history(AdaptationRule.RestartBlock, '2026-10-23', status)];
        expect(off('2026-11-06', { sessions: behind, history: stored })).toEqual([]);
      }
    });

    it('needs an unfinished Session to restart', () => {
      const done = sessions.map((session) => ({ ...session, started: true, finished: true }));
      expect(off('2026-11-06', { sessions: done })).toEqual([]);
    });
  });
});

describe('proposeAdaptations', () => {
  it('suggests nothing for a good week with nothing to react to', () => {
    const context = adaptationContext({
      today: '2026-11-04',
      generation: BASKETBALL_GENERATION,
      sessions: programSessions(BASKETBALL_GENERATION),
      checkins: [checkinFact('c1', '2026-11-04', [4, 4, 4])],
    });
    expect(proposeAdaptations(context)).toEqual([]);
  });

  it('is deterministic and does not change its input', () => {
    const context = adaptationContext({
      today: '2026-11-07',
      sessions: layout([Lower, '2026-11-07']),
      checkins: [checkinFact('c1', '2026-11-07', [1, 1, 1])],
      activities: [activityFact('a1', '2026-11-07')],
    });
    const before = structuredClone(context);
    const first = proposeAdaptations(context);
    expect(first.map(({ ruleId }) => ruleId)).toEqual([
      AdaptationRule.UnplannedActivity,
      AdaptationRule.PoorCheckin,
    ]);
    expect(proposeAdaptations(context)).toEqual(first);
    expect(context).toEqual(before);
  });

  it('plans for a Limited person with the same rules', () => {
    const generation: GenerationBasis = { ...PADEL_GENERATION, mode: TrainingMode.Limited };
    const context = adaptationContext({
      today: '2026-11-07',
      generation,
      sessions: layout([Lower, '2026-11-07']),
      checkins: [checkinFact('c1', '2026-11-07', [1, 1, 1])],
    });
    expect(proposeAdaptations(context)[0]?.change.kind).toBe(AdaptationChangeKind.LightenSession);
  });
});
