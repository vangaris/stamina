import { RecordStatus, type SessionDetail } from '@stamina/contracts';
import {
  AdaptationChangeKind,
  AdaptationRule,
  AdaptationStatus,
  DELOAD_LOAD_FACTOR,
  DELOAD_SET_FACTOR,
  FAILURE_RPE,
  Intensity,
  LIGHTER_RIR_STEP,
  LIGHTER_SETS_STEP,
  LaunchSport,
  RESTART_RIR_STEP,
  SessionFocus,
  SessionSlot,
  Weekday,
  addDays,
} from '@stamina/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EXERCISE_DATA_DIR } from '../src/exercises/node.ts';
import { insertActivity } from './support/activity-fixtures.ts';
import { checkinOf, postCheckin } from './support/checkin-fixtures.ts';
import {
  acceptedProgram,
  adaptationOf,
  blockRowsOf,
  getAdaptations,
  pendingRules,
  postDecline,
  postGoodCheckin,
  postHardActivity,
  postPoorCheckin,
  sessionOfFocus,
  sessionRowsOf,
} from './support/adaptation-fixtures.ts';
import {
  ALL_DAYS,
  PROGRAM_NOW,
  approveSport,
  basketballPersona,
  padelPersona,
  programUser,
} from './support/program-fixtures.ts';
import type { FixtureUser, TestApi } from './support/safety-fixtures.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import { postFinish, readSessionOf, sessionsOf } from './support/session-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

/** The days of the Program the personas get when it is made on `PROGRAM_NOW` (Thursday 2026-11-05). */
const SAT = '2026-11-07';
const SUN = '2026-11-08';
const MON = '2026-11-09';
const TUE = '2026-11-10';
const WED = '2026-11-11';
/** Reps in reserve of the Deload week (week 4 of a Block). */
const DELOAD_RIR = 4;
const noon = (day: string) => new Date(`${day}T12:00:00.000Z`);

/**
 * Padel on Tuesday and Friday: Saturday (lower), Monday (recovery) and Wednesday (upper) get
 * a Session. Lower work needs 48 hours clear of a hard Activity, upper 24.
 */
const PADEL_WINDOW = { lower: 48, upper: 24 };

/**
 * Basketball on Thursday only, three 30-minute Sessions on any day: Friday (lower), Sunday
 * (upper) and Tuesday (lower). Recovery windows are 24 hours, so a hard Saturday leaves Monday free.
 */
const thursdayBasketball = {
  ...basketballPersona,
  playDays: [Weekday.Thu],
  trainingWeek: { sessionsPerWeek: 3, sessionMinutes: 30, availableDays: ALL_DAYS },
};

describe('Adaptations', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;
  let clock = PROGRAM_NOW;

  beforeAll(async () => {
    scratch = await createScratchDatabase(EXERCISE_DATA_DIR);
    api = await startTestApi({ databaseUrl: scratch.url, now: () => clock });
    await approveSport(api, LaunchSport.Padel, (profile) => ({
      ...profile,
      recoveryWindowHours: PADEL_WINDOW,
    }));
    await approveSport(api, LaunchSport.Basketball);
  });
  afterAll(async () => {
    await api.close();
    await scratch.drop();
  });

  /** A fresh player with a Program made on `PROGRAM_NOW`; the clock then moves to `day` at noon. */
  const player = async (submission = padelPersona(), day = SAT) => {
    clock = PROGRAM_NOW;
    const user = await programUser(api, { submission });
    const { week, details } = await sessionsOf(user);
    clock = noon(day);
    return { user, week, details };
  };

  describe('an unplanned hard Activity before the next heavy Session', () => {
    it('suggests moving the Session a day when that day is free, clear of the window and a play day', async () => {
      const { user, week } = await player(thursdayBasketball);
      const upper = sessionOfFocus(week, SessionFocus.Upper);
      expect(upper.date).toBe(SUN);

      const { result } = await postHardActivity(user, SAT);
      expect(result.status).toBe(RecordStatus.Saved);

      const suggestion = await adaptationOf(user, AdaptationRule.UnplannedActivity);
      expect(suggestion).toMatchObject({
        status: AdaptationStatus.Pending,
        change: { kind: AdaptationChangeKind.MoveSession, sessionId: upper.id, from: SUN, to: MON },
        params: { load: 480, minutes: 60, hours: 24, windowHours: 24 },
        basis: [{ sessionId: upper.id, revision: 1 }],
        validUntil: SUN,
        decidedAt: null,
      });

      const moved = await acceptedProgram(user, suggestion);
      expect(moved.sessions.map(({ date }) => date)).toEqual(
        week.sessions.map(({ date }) => (date === SUN ? MON : date)),
      );
      expect(sessionOfFocus(moved, SessionFocus.Upper)).toMatchObject({
        date: MON,
        weekday: Weekday.Mon,
        revision: 2,
      });
      expect(sessionOfFocus(moved, SessionFocus.Upper).exercises).toEqual(upper.exercises);
    });

    it('suggests a Recovery Session when no day to move to is free', async () => {
      const { user, week } = await player(padelPersona());
      const lower = sessionOfFocus(week, SessionFocus.Lower);
      expect(lower.date).toBe(SAT);

      await postHardActivity(user, SAT);

      const suggestion = await adaptationOf(user, AdaptationRule.UnplannedActivity);
      expect(suggestion.change).toEqual({
        kind: AdaptationChangeKind.SwapToRecovery,
        sessionId: lower.id,
      });
      expect(suggestion.params).toEqual({ load: 480, minutes: 60, hours: 0, windowHours: 48 });

      const swapped = await acceptedProgram(user, suggestion);
      const recovery = swapped.sessions.find(({ date }) => date === SAT)!;
      expect(recovery).toMatchObject({ date: SAT, focus: SessionFocus.Recovery, revision: 2 });
      expect(recovery.exercises.map(({ slot }) => slot)).not.toContain(SessionSlot.MainStrength);
    });

    it('raises it once however often the rules run', async () => {
      const { user } = await player(padelPersona());
      await postHardActivity(user, SAT);

      const first = await getAdaptations(user);
      const second = await getAdaptations(user);

      expect(first).toHaveLength(1);
      expect(second).toEqual(first);
    });

    it('does not raise it for a moderate Activity, a played day or one outside the window', async () => {
      const { user } = await player(padelPersona(), SUN);
      await insertActivity(api, user, SAT, 60, Intensity.Moderate);
      // Sunday to Wednesday is 72 hours: past the 24-hour window of an upper Session.
      await postHardActivity(user, SUN);

      expect(await pendingRules(user)).toEqual([]);
    });
  });

  describe('a Check-in', () => {
    it('that is poor lightens the Session of its day: one rep more in reserve and one set fewer', async () => {
      const { user, week } = await player();
      const lower = sessionOfFocus(week, SessionFocus.Lower);
      const before = await readSessionOf(user, lower.id);
      await postPoorCheckin(user, SAT);

      const suggestion = await adaptationOf(user, AdaptationRule.PoorCheckin);
      expect(suggestion).toMatchObject({
        change: { kind: AdaptationChangeKind.LightenSession, sessionId: lower.id },
        params: { sleep: 1, soreness: 1, energy: 1 },
        basis: [{ sessionId: lower.id, revision: 1 }],
        validUntil: SAT,
      });

      const lightened = sessionOfFocus(await acceptedProgram(user, suggestion), SessionFocus.Lower);
      expect(lightened.revision).toBe(2);
      expect(lightened.exercises.map(({ exerciseId }) => exerciseId)).toEqual(
        before.exercises.map(({ exerciseId }) => exerciseId),
      );
      lightened.exercises.forEach((exercise, index) => {
        const old = before.exercises[index]!;
        expect(exercise.rir).toBe(old.rir === null ? null : old.rir + LIGHTER_RIR_STEP);
        expect(exercise.sets).toBe(Math.max(1, old.sets - LIGHTER_SETS_STEP));
      });
    });

    it('that only reports soreness lightens the Session when the library has nothing to swap in for its main lift', async () => {
      const { user, week } = await player();
      const lower = sessionOfFocus(week, SessionFocus.Lower);
      await postCheckin(user, checkinOf(SAT, { sleep: 4, soreness: 2, energy: 4 }));

      const suggestion = await adaptationOf(user, AdaptationRule.SoreArea);

      expect(suggestion).toMatchObject({
        change: { kind: AdaptationChangeKind.LightenSession, sessionId: lower.id },
        params: { soreness: 2 },
        validUntil: SAT,
      });
      expect(await pendingRules(user)).toEqual([AdaptationRule.SoreArea]);
    });

    it('that is good changes nothing, nor does one on a day with no heavy Session', async () => {
      const { user } = await player();

      await postGoodCheckin(user, SAT);
      await postPoorCheckin(user, SUN);

      expect(await pendingRules(user)).toEqual([]);
    });

    it('is not suggested on once its day has passed', async () => {
      const { user } = await player();
      await postPoorCheckin(user, SAT);
      expect(await pendingRules(user)).toEqual([AdaptationRule.PoorCheckin]);

      clock = noon(SUN);

      expect(await pendingRules(user)).toEqual([]);
    });
  });

  describe('an early Deload', () => {
    /** Halves the sets and asks for at least the Deload week's reps in reserve. */
    const expectDeloaded = (after: SessionDetail, before: SessionDetail) => {
      expect(after.revision).toBe(before.revision + 1);
      after.exercises.forEach((exercise, index) => {
        const old = before.exercises[index]!;
        expect(exercise.exerciseId).toBe(old.exerciseId);
        expect(exercise.sets).toBe(Math.max(1, Math.ceil(old.sets * DELOAD_SET_FACTOR)));
        expect(exercise.rir).toBe(old.rir === null ? null : Math.max(old.rir, DELOAD_RIR));
      });
    };

    it('follows two heavy weeks: Load above the average, and accepting halves the sets still ahead', async () => {
      const { user, details } = await player(basketballPersona, SUN);
      // The week of 10-23 is the person's usual; the next one and this one are heavy.
      await insertActivity(api, user, '2026-10-25', 30, Intensity.Moderate);
      await insertActivity(api, user, '2026-11-02', 300, Intensity.Moderate);
      await insertActivity(api, user, SAT, 300, Intensity.Moderate);

      const suggestion = await adaptationOf(user, AdaptationRule.DeloadLoad);

      expect(suggestion.params).toEqual({
        load: 1800,
        previousLoad: 1800,
        average: 180,
        percent: Math.round(DELOAD_LOAD_FACTOR * 100),
      });
      expect(suggestion.change).toEqual({
        kind: AdaptationChangeKind.DeloadWeek,
        sessionIds: details.map(({ id }) => id),
      });
      expect(suggestion.validUntil).toBe('2026-11-12');

      const deloaded = await acceptedProgram(user, suggestion);
      expect(deloaded.sessions).toHaveLength(details.length);
      for (const before of details) {
        const after = deloaded.sessions.find(({ date }) => date === before.date)!;
        expectDeloaded(await readSessionOf(user, after.id), before);
      }
    });

    it('does not follow one heavy week', async () => {
      const { user } = await player(basketballPersona, SUN);
      await insertActivity(api, user, '2026-10-25', 30, Intensity.Moderate);
      await insertActivity(api, user, SAT, 300, Intensity.Moderate);

      expect(await pendingRules(user)).toEqual([]);
    });

    it('follows three poor Check-ins in five days', async () => {
      const { user, details } = await player(padelPersona(), SUN);
      clock = noon('2026-11-05');
      await postPoorCheckin(user, '2026-11-05');
      clock = noon('2026-11-06');
      await postPoorCheckin(user, '2026-11-06');
      expect(await pendingRules(user)).toEqual([]);
      clock = noon(SUN);
      await postPoorCheckin(user, SUN);

      const suggestion = await adaptationOf(user, AdaptationRule.DeloadCheckins);
      expect(suggestion.params).toEqual({ count: 3, days: 5 });

      // Saturday is behind us: the Deload covers the Monday and Wednesday Sessions.
      const ahead = details.filter(({ date }) => date >= SUN);
      expect(suggestion.change).toEqual({
        kind: AdaptationChangeKind.DeloadWeek,
        sessionIds: ahead.map(({ id }) => id),
      });
      const deloaded = await acceptedProgram(user, suggestion);
      for (const before of ahead) {
        const after = deloaded.sessions.find(({ date }) => date === before.date)!;
        expectDeloaded(await readSessionOf(user, after.id), before);
      }
      const saturday = deloaded.sessions.find(({ date }) => date === SAT)!;
      expect(saturday.revision).toBe(1);
    });

    it('follows two finished Sessions at the target effort plus two', async () => {
      const { user, details } = await player();
      const [saturday, monday, wednesday] = details as [
        SessionDetail,
        SessionDetail,
        SessionDetail,
      ];
      const target = FAILURE_RPE - 3;
      await postFinish(user, saturday.id, { id: crypto.randomUUID(), rpe: target + 2 });
      clock = noon(MON);
      expect(await pendingRules(user)).toEqual([]);
      await postFinish(user, monday.id, { id: crypto.randomUUID(), rpe: target + 2 });

      const suggestion = await adaptationOf(user, AdaptationRule.DeloadEffort);
      expect(suggestion.params).toEqual({ sessions: 2, margin: 2 });
      expect(suggestion.change).toMatchObject({
        kind: AdaptationChangeKind.DeloadWeek,
        sessionIds: [wednesday.id],
      });

      const deloaded = await acceptedProgram(user, suggestion);
      expectDeloaded(
        await readSessionOf(user, deloaded.sessions.find(({ date }) => date === WED)!.id),
        wednesday,
      );
    });

    it('does not follow two Sessions that were not harder than planned', async () => {
      const { user, details } = await player();
      await postFinish(user, details[0]!.id, { id: crypto.randomUUID(), rpe: FAILURE_RPE - 3 + 1 });
      clock = noon(MON);
      await postFinish(user, details[1]!.id, { id: crypto.randomUUID(), rpe: FAILURE_RPE - 3 + 2 });

      expect(await pendingRules(user)).toEqual([]);
    });

    describe('after it is declined', () => {
      /** The pending Deloads; two missed Sessions raise a repeated week by Tuesday, which is not the subject here. */
      const deloadRules = async (user: FixtureUser) =>
        (await pendingRules(user)).filter((ruleId) => ruleId.startsWith('deload'));

      /** Three poor Check-ins by Sunday raise a Deload; the person keeps their plan on Sunday noon. */
      const declinedOnSunday = async () => {
        const fixture = await player(padelPersona(), SUN);
        for (const day of ['2026-11-05', '2026-11-06', SUN])
          await postPoorCheckin(fixture.user, day);
        const first = await adaptationOf(fixture.user, AdaptationRule.DeloadCheckins);
        await postDecline(fixture.user, first.id);
        return { ...fixture, first };
      };

      it('is not asked again before three days pass, even when the reason still holds', async () => {
        const { user } = await declinedOnSunday();
        for (const day of [MON, TUE]) await postPoorCheckin(user, day);

        // Monday noon is one day on, Tuesday noon two.
        clock = noon(MON);
        expect(await deloadRules(user)).toEqual([]);
        clock = noon(TUE);
        expect(await deloadRules(user)).toEqual([]);
      });

      it('is asked again once three days pass and the reason still holds', async () => {
        const { user, first } = await declinedOnSunday();
        for (const day of [MON, TUE]) await postPoorCheckin(user, day);

        clock = noon(WED);
        const again = await adaptationOf(user, AdaptationRule.DeloadCheckins);

        expect(again.id).not.toBe(first.id);
        expect(again.status).toBe(AdaptationStatus.Pending);
        expect(again.change).toMatchObject({ kind: AdaptationChangeKind.DeloadWeek });
        // Wednesday noon is exactly three days after the decline; asking again is one more ask, never a loop.
        expect(await deloadRules(user)).toEqual([AdaptationRule.DeloadCheckins]);
      });

      it('is not asked again when the reason no longer holds', async () => {
        const { user } = await declinedOnSunday();

        clock = noon(WED);

        expect(await deloadRules(user)).toEqual([]);
      });
    });
  });

  describe('Sessions left undone', () => {
    it('skips one missed Session, never stacking it', async () => {
      const { user } = await player(padelPersona(), SUN);

      expect(await pendingRules(user)).toEqual([]);
    });

    it('suggests repeating the week from tomorrow after two, and accepting starts a new Block', async () => {
      const { user, week, details } = await player(padelPersona(), TUE);

      const suggestion = await adaptationOf(user, AdaptationRule.RepeatWeek);
      expect(suggestion).toMatchObject({
        change: { kind: AdaptationChangeKind.RepeatWeek, startsOn: WED, weekInBlock: 1 },
        params: { missed: 2, weekInBlock: 1 },
        validUntil: null,
      });
      expect(suggestion.basis).toEqual(
        week.sessions.map(({ id }) => ({ sessionId: id, revision: 1 })),
      );

      const repeated = await acceptedProgram(user, suggestion);

      expect(repeated.block).toMatchObject({ startsOn: WED, weekInBlock: 1 });
      expect(repeated.sessions).toHaveLength(week.sessions.length);
      for (const planned of repeated.sessions) {
        expect(planned.date >= WED && planned.date <= addDays(WED, 6)).toBe(true);
        expect(planned.revision).toBe(2);
        expect(details.map(({ id }) => id)).not.toContain(planned.id);
      }
      const blocks = await blockRowsOf(api, user.userId);
      expect(blocks.map(({ position, startsOn }) => ({ position, startsOn }))).toEqual([
        { position: 1, startsOn: '2026-11-06' },
        { position: 2, startsOn: WED },
      ]);
      const rows = await sessionRowsOf(api, user.userId);
      const replaced = new Set(details.map(({ id }) => id));
      const fresh = rows.filter(({ id }) => !replaced.has(id));
      expect(fresh.map(({ supersedesId }) => supersedesId).sort()).toEqual([...replaced].sort());
      expect(fresh.every(({ blockId }) => blockId === blocks[1]!.id)).toBe(true);
      // Nothing is raised again for the week that was just replaced.
      expect(await pendingRules(user)).toEqual([]);
    });

    it('suggests restarting the Block after fourteen days without a Session, one rep more in reserve', async () => {
      const { user, week, details } = await player(padelPersona(), '2026-11-20');

      expect(await pendingRules(user)).toEqual([AdaptationRule.RestartBlock]);
      const suggestion = await adaptationOf(user, AdaptationRule.RestartBlock);
      expect(suggestion).toMatchObject({
        change: { kind: AdaptationChangeKind.RestartBlock, startsOn: '2026-11-21' },
        params: { daysOff: 14 },
        validUntil: null,
      });

      const restarted = await acceptedProgram(user, suggestion);

      expect(restarted.block).toMatchObject({ startsOn: '2026-11-21', weekInBlock: 1 });
      const before = details
        .flatMap(({ exercises }) => exercises)
        .filter(({ rir }) => rir !== null);
      const after = (await Promise.all(restarted.sessions.map(({ id }) => readSessionOf(user, id))))
        .flatMap(({ exercises }) => exercises)
        .filter(({ rir }) => rir !== null);
      expect(Math.min(...after.map(({ rir }) => rir!))).toBe(
        Math.min(...before.map(({ rir }) => rir!)) + RESTART_RIR_STEP,
      );
      expect((await blockRowsOf(api, user.userId)).map(({ position }) => position)).toEqual([1, 2]);
      const hashes = new Set(
        (await sessionRowsOf(api, user.userId)).map(({ inputsHash }) => inputsHash),
      );
      expect(hashes.size).toBe(2);
      expect(week.block.startsOn).toBe('2026-11-06');
    });

    it('is not suggested again after the person declines it', async () => {
      const { user } = await player(padelPersona(), TUE);
      const suggestion = await adaptationOf(user, AdaptationRule.RepeatWeek);
      await postDecline(user, suggestion.id);

      expect(await pendingRules(user)).toEqual([]);
      clock = noon(WED);
      expect(await pendingRules(user)).toEqual([]);
    });
  });
});
