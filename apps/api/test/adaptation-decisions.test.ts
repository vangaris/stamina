import {
  AdaptationRejection,
  ApiPath,
  HttpMethod,
  RecordStatus,
  adaptationPath,
  AdaptationSubpath,
  userExportSchema,
} from '@stamina/contracts';
import {
  AdaptationChangeKind,
  AdaptationRule,
  AdaptationStatus,
  BodyArea,
  LaunchSport,
  SessionFocus,
  StopFlag,
} from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  adaptation,
  adaptationDecision,
  block,
  session,
  sessionExercise,
} from '../src/db/schema.ts';
import type { UserTx } from '../src/db/types.ts';
import { withUser } from '../src/db/with-user.ts';
import { EXERCISE_DATA_DIR } from '../src/exercises/node.ts';
import {
  acceptedProgram,
  adaptationOf,
  exerciseRowsOf,
  getAdaptations,
  pendingRules,
  postAccept,
  postDecline,
  postHardActivity,
  postPoorCheckin,
  sessionOfFocus,
  sessionRowsOf,
} from './support/adaptation-fixtures.ts';
import {
  PROGRAM_NOW,
  approveSport,
  getProgram,
  libraryById,
  padelPersona,
  programUser,
} from './support/program-fixtures.ts';
import {
  PG_INSUFFICIENT_PRIVILEGE,
  newUser,
  type FixtureUser,
  type TestApi,
} from './support/safety-fixtures.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import { getSession, postFinish, postSet, sessionsOf, setOf } from './support/session-fixtures.ts';
import { postConfirm, postStopFlag, stopFlagOf } from './support/stop-flag-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

const SAT = '2026-11-07';
const SUN = '2026-11-08';
const TUE = '2026-11-10';
const noon = (day: string, hour = 12) =>
  new Date(`${day}T${String(hour).padStart(2, '0')}:00:00.000Z`);

describe('Deciding on Adaptations', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;
  let clock = PROGRAM_NOW;
  const logLines: string[] = [];

  beforeAll(async () => {
    scratch = await createScratchDatabase(EXERCISE_DATA_DIR);
    api = await startTestApi({
      databaseUrl: scratch.url,
      now: () => clock,
      log: (line) => logLines.push(line),
    });
    await approveSport(api, LaunchSport.Padel, (profile) => ({
      ...profile,
      recoveryWindowHours: { lower: 48, upper: 24 },
    }));
  });
  afterAll(async () => {
    await api.close();
    await scratch.drop();
  });

  /** A padel player with a Program made on `PROGRAM_NOW` (Saturday lower, Monday recovery, Wednesday upper); the clock then moves to `day` at noon. */
  const player = async (day = SAT) => {
    clock = PROGRAM_NOW;
    const user = await programUser(api, { submission: padelPersona() });
    const { week, details } = await sessionsOf(user);
    clock = noon(day);
    return {
      user,
      week,
      details,
      lower: details.find(({ focus }) => focus === SessionFocus.Lower)!,
    };
  };

  /** Two suggestions for Saturday's lower Session: lighten it (poor Check-in) or make it a Recovery Session (hard unplanned match). */
  const twoSuggestions = async () => {
    const fixture = await player();
    clock = noon(SAT, 11);
    await postHardActivity(fixture.user, SAT);
    clock = noon(SAT);
    await postPoorCheckin(fixture.user, SAT);
    return {
      ...fixture,
      swap: await adaptationOf(fixture.user, AdaptationRule.UnplannedActivity),
      lighten: await adaptationOf(fixture.user, AdaptationRule.PoorCheckin),
    };
  };

  const decisionRows = (user: FixtureUser) =>
    api.db.select().from(adaptationDecision).where(eq(adaptationDecision.userId, user.userId));

  describe('the list', () => {
    it('is empty before there is a Program', async () => {
      const user = await newUser(api);

      expect(await getAdaptations(user)).toEqual([]);
    });

    it('lists the oldest suggestion first', async () => {
      const { user } = await player();
      clock = noon(SAT, 9);
      await postHardActivity(user, SAT);
      clock = noon(SAT, 10);
      await postPoorCheckin(user, SAT);

      expect(await pendingRules(user)).toEqual([
        AdaptationRule.UnplannedActivity,
        AdaptationRule.PoorCheckin,
      ]);
    });

    it('answers 401 without a token', async () => {
      const response = await fetch(`${api.baseUrl}${adaptationPath()}`);

      expect(response.status).toBe(401);
    });

    it('hides a suggestion once its Session was finished or started', async () => {
      const finished = await player();
      await postPoorCheckin(finished.user, SAT);
      expect(await pendingRules(finished.user)).toEqual([AdaptationRule.PoorCheckin]);
      await postFinish(finished.user, finished.lower.id, { id: crypto.randomUUID(), rpe: 6 });
      expect(await pendingRules(finished.user)).toEqual([]);

      const started = await player();
      await postPoorCheckin(started.user, SAT);
      const main = started.lower.exercises.find(({ rir }) => rir !== null)!;
      await postSet(started.user, started.lower.id, setOf(main.exerciseId, 1, 40, 8, 7));
      expect(await pendingRules(started.user)).toEqual([]);
    });

    it('is empty while training is paused, and a suggestion cannot be accepted then; it is back once the pause ends', async () => {
      const { user } = await player();
      await postPoorCheckin(user, SAT);
      const suggestion = await adaptationOf(user, AdaptationRule.PoorCheckin);

      await postStopFlag(user, stopFlagOf(StopFlag.ChestPain, SAT));
      expect(await getAdaptations(user)).toEqual([]);
      const { status, result } = await postAccept(user, suggestion);
      expect(status).toBe(422);
      expect(result).toMatchObject({
        status: RecordStatus.Rejected,
        reason: AdaptationRejection.Stale,
      });
      expect(await decisionRows(user)).toEqual([]);

      await postConfirm(user, [StopFlag.ChestPain]);
      expect((await getAdaptations(user)).map(({ id }) => id)).toEqual([suggestion.id]);
    });
  });

  describe('accepting', () => {
    it('stores new revisions beside the old Sessions, records the decision and shows only the current Sessions', async () => {
      const { user, week, lower } = await twoSuggestions();
      const before = await sessionRowsOf(api, user.userId);
      const decided = clock;

      const { status, result } = await postAccept(
        user,
        await adaptationOf(user, AdaptationRule.PoorCheckin),
      );

      expect(status).toBe(200);
      if (result.status !== RecordStatus.Saved) throw new Error('saved');
      expect(result.recorded).toBe(true);
      expect(result.adaptation).toMatchObject({
        status: AdaptationStatus.Accepted,
        decidedAt: decided.toISOString(),
      });
      expect(result.program.sessions.map(({ id }) => id)).not.toContain(lower.id);
      expect(result.program).toEqual(await getProgram(user));

      const after = await sessionRowsOf(api, user.userId);
      expect(after).toHaveLength(before.length + 1);
      const old = after.find(({ id }) => id === lower.id)!;
      const revised = after.find(({ supersedesId }) => supersedesId === lower.id)!;
      expect(old).toEqual(before.find(({ id }) => id === lower.id));
      expect(revised).toMatchObject({
        blockId: old.blockId,
        revision: 2,
        date: old.date,
        rulesVersion: old.rulesVersion,
        inputsHash: old.inputsHash,
        limited: old.limited,
        beta: old.beta,
        status: old.status,
      });
      expect((await exerciseRowsOf(api, lower.id)).map(({ sets }) => sets)).toEqual(
        lower.exercises.map(({ sets }) => sets),
      );
      expect(week.sessions.map(({ id }) => id)).toContain(lower.id);
      expect(await decisionRows(user)).toHaveLength(1);
      expect(await pendingRules(user)).toEqual([]);
    });

    it('keeps the AI’s record while the exercises are the same, and drops it when they change', async () => {
      const kept = await twoSuggestions();
      await api.db
        .update(session)
        .set({ model: 'fake-model', promptVersion: 'v1' })
        .where(eq(session.id, kept.lower.id));
      await api.db
        .update(sessionExercise)
        .set({ pickReason: 'Fits the slot' })
        .where(eq(sessionExercise.sessionId, kept.lower.id));

      await acceptedProgram(kept.user, kept.lighten);
      const lightened = (await sessionRowsOf(api, kept.user.userId)).find(
        ({ supersedesId }) => supersedesId === kept.lower.id,
      )!;
      expect(lightened).toMatchObject({ model: 'fake-model', promptVersion: 'v1' });
      expect((await exerciseRowsOf(api, lightened.id)).map(({ pickReason }) => pickReason)).toEqual(
        kept.lower.exercises.map(() => 'Fits the slot'),
      );

      const swapped = await twoSuggestions();
      await api.db
        .update(session)
        .set({ model: 'fake-model', promptVersion: 'v1' })
        .where(eq(session.id, swapped.lower.id));
      await api.db
        .update(sessionExercise)
        .set({ pickReason: 'Fits the slot' })
        .where(eq(sessionExercise.sessionId, swapped.lower.id));

      await acceptedProgram(swapped.user, swapped.swap);
      const recovery = (await sessionRowsOf(api, swapped.user.userId)).find(
        ({ supersedesId }) => supersedesId === swapped.lower.id,
      )!;
      expect(recovery).toMatchObject({
        focus: SessionFocus.Recovery,
        model: null,
        promptVersion: null,
      });
      const reasons = await exerciseRowsOf(api, recovery.id);
      for (const row of reasons) {
        expect(row.pickReason).toBe(
          swapped.lower.exercises.some(({ exerciseId }) => exerciseId === row.exerciseId)
            ? 'Fits the slot'
            : null,
        );
      }
    });

    it('replays: a second accept changes nothing and says it was not recorded', async () => {
      const { user, lighten } = await twoSuggestions();
      const program = await acceptedProgram(user, lighten);
      const rows = await sessionRowsOf(api, user.userId);

      const { status, result } = await postAccept(user, lighten);

      expect(status).toBe(200);
      expect(result).toMatchObject({
        status: RecordStatus.Saved,
        recorded: false,
        adaptation: { id: lighten.id, status: AdaptationStatus.Accepted },
        program,
      });
      expect(await sessionRowsOf(api, user.userId)).toEqual(rows);
      expect(await decisionRows(user)).toHaveLength(1);
    });

    it('is stale when another suggestion already revised the Session: nothing stored, nothing decided, the latest week returned', async () => {
      const { user, swap, lighten } = await twoSuggestions();
      const lightened = await acceptedProgram(user, lighten);
      const rows = await sessionRowsOf(api, user.userId);

      const { status, result } = await postAccept(user, swap);

      expect(status).toBe(422);
      expect(result).toEqual({
        status: RecordStatus.Rejected,
        reason: AdaptationRejection.Stale,
        program: lightened,
      });
      expect(await sessionRowsOf(api, user.userId)).toEqual(rows);
      expect(await decisionRows(user)).toHaveLength(1);
      expect(await getAdaptations(user)).toEqual([]);
    });

    it('is stale when the Session was finished meanwhile', async () => {
      const { user, lower, lighten } = await twoSuggestions();
      await postFinish(user, lower.id, { id: crypto.randomUUID(), rpe: 6 });
      const rows = await sessionRowsOf(api, user.userId);

      const { status, result } = await postAccept(user, lighten);

      expect(status).toBe(422);
      expect(result).toMatchObject({
        status: RecordStatus.Rejected,
        reason: AdaptationRejection.Stale,
        program: await getProgram(user),
      });
      expect(await sessionRowsOf(api, user.userId)).toEqual(rows);
      expect(await decisionRows(user)).toEqual([]);
    });

    it('is stale when the basis sent is not the one stored', async () => {
      const { user, lower, lighten } = await twoSuggestions();

      for (const basis of [
        [],
        [{ sessionId: lower.id, revision: 2 }],
        [{ sessionId: crypto.randomUUID(), revision: 1 }],
        [...lighten.basis, { sessionId: crypto.randomUUID(), revision: 1 }],
      ]) {
        const { status, result } = await postAccept(user, lighten, basis);
        expect(status).toBe(422);
        expect(result).toMatchObject({ reason: AdaptationRejection.Stale });
      }
      expect(await decisionRows(user)).toEqual([]);
      expect(await sessionRowsOf(api, user.userId)).toHaveLength(3);
    });

    it('is stale after the suggestion’s last day', async () => {
      const { user, lighten } = await twoSuggestions();
      clock = noon(SUN);

      const { status, result } = await postAccept(user, lighten);

      expect(status).toBe(422);
      expect(result).toMatchObject({ reason: AdaptationRejection.Stale });
      expect(await decisionRows(user)).toEqual([]);
    });

    it('answers 400 for a body without a basis, and stores nothing', async () => {
      const { user, lighten } = await twoSuggestions();

      for (const body of [
        undefined,
        {},
        { basis: 'x' },
        { basis: [{ sessionId: 'x', revision: 1 }] },
      ]) {
        const response = await user.call(
          HttpMethod.Post,
          adaptationPath(lighten.id, AdaptationSubpath.Accept),
          body,
        );
        expect(response.status).toBe(400);
      }
      expect(await decisionRows(user)).toEqual([]);
    });
  });

  describe('declining', () => {
    it('changes nothing in the Program and records the decision', async () => {
      const { user, lower, lighten } = await twoSuggestions();
      const rows = await sessionRowsOf(api, user.userId);

      const { status, result } = await postDecline(user, lighten.id);

      expect(status).toBe(200);
      expect(result).toMatchObject({
        status: RecordStatus.Saved,
        recorded: true,
        adaptation: {
          id: lighten.id,
          status: AdaptationStatus.Declined,
          decidedAt: clock.toISOString(),
        },
      });
      expect(await sessionRowsOf(api, user.userId)).toEqual(rows);
      expect(await getAdaptations(user)).toHaveLength(1);
      expect((await getProgram(user))!.sessions.map(({ id }) => id)).toContain(lower.id);
    });

    it('replays: a second decline changes nothing and says it was not recorded', async () => {
      const { user, lighten } = await twoSuggestions();
      await postDecline(user, lighten.id);
      clock = noon(SAT, 15);

      const { status, result } = await postDecline(user, lighten.id);

      expect(status).toBe(200);
      expect(result).toMatchObject({
        status: RecordStatus.Saved,
        recorded: false,
        adaptation: { status: AdaptationStatus.Declined, decidedAt: noon(SAT).toISOString() },
      });
      expect(await decisionRows(user)).toHaveLength(1);
    });

    it('cannot be accepted afterwards, and an accepted one cannot be declined', async () => {
      const { user, swap, lighten } = await twoSuggestions();
      await postDecline(user, lighten.id);
      const accepted = await acceptedProgram(user, swap);

      const accept = await postAccept(user, lighten);
      const decline = await postDecline(user, swap.id);

      expect(accept.status).toBe(422);
      expect(accept.result).toEqual({
        status: RecordStatus.Rejected,
        reason: AdaptationRejection.AlreadyDecided,
        program: accepted,
      });
      expect(decline.status).toBe(422);
      expect(decline.result).toEqual({
        status: RecordStatus.Rejected,
        reason: AdaptationRejection.AlreadyDecided,
      });
      expect(await decisionRows(user)).toHaveLength(2);
    });
  });

  describe('a Session a revision replaced', () => {
    it('opens as its current revision, and takes a set or finish queued before the plan changed', async () => {
      const { user, lower, lighten } = await twoSuggestions();
      const lightened = sessionOfFocus(await acceptedProgram(user, lighten), SessionFocus.Lower);
      const main = lower.exercises.find(({ rir }) => rir !== null)!;

      const { status, session: opened } = await getSession(user, lower.id);
      const set = await user.call(
        HttpMethod.Post,
        `/sessions/${lower.id}/sets`,
        setOf(main.exerciseId, 1, 40, 8, 7),
      );
      const finish = await user.call(HttpMethod.Post, `/sessions/${lower.id}/finish`, {
        id: crypto.randomUUID(),
        rpe: 6,
      });

      expect(status).toBe(200);
      expect(opened).toMatchObject({ id: lightened.id, revision: 2 });
      expect(set.status).toBe(200);
      expect(await set.json()).toMatchObject({ status: RecordStatus.Saved, recorded: true });
      expect(finish.status).toBe(200);
      const current = (await getSession(user, lightened.id)).session;
      expect(current).not.toBeNull();
      expect(current!.finished).not.toBeNull();
      expect(
        current!.exercises.find(({ exerciseId }) => exerciseId === main.exerciseId)?.loggedSets,
      ).toEqual([expect.objectContaining({ setNumber: 1, reps: 8 })]);
    });

    it('resolves through every revision, to the newest', async () => {
      const { user, lower, lighten } = await twoSuggestions();
      await postDecline(user, lighten.id);
      clock = noon(SAT, 13);
      await postPoorCheckin(user, SAT);
      const again = await adaptationOf(user, AdaptationRule.PoorCheckin);
      const first = sessionOfFocus(await acceptedProgram(user, again), SessionFocus.Lower);
      clock = noon(SAT, 14);
      await postHardActivity(user, SAT, 90);
      const second = await adaptationOf(user, AdaptationRule.UnplannedActivity);

      const swapped = sessionOfFocus(await acceptedProgram(user, second), SessionFocus.Recovery);

      expect(first.revision).toBe(2);
      expect(swapped.revision).toBe(3);
      for (const id of [lower.id, first.id, swapped.id]) {
        expect((await getSession(user, id)).session).toMatchObject({ id: swapped.id, revision: 3 });
      }
    });
  });

  describe('a new-pain flag', () => {
    it('rewrites the upcoming Sessions that load the area without asking, and leaves finished ones', async () => {
      const { user, week, details, lower } = await player();
      await postFinish(user, lower.id, { id: crypto.randomUUID(), rpe: 6 });
      clock = noon(SUN);
      const library = await libraryById(user);
      const loadsKnee = (exerciseId: string) =>
        library.get(exerciseId)!.highLoadAreas.includes(BodyArea.Knee);
      const ahead = details.filter(({ date }) => date > SAT);
      expect(
        ahead.some(({ exercises }) => exercises.some(({ exerciseId }) => loadsKnee(exerciseId))),
      ).toBe(true);

      const { status } = await postStopFlag(user, stopFlagOf(StopFlag.NewPain, SUN));

      expect(status).toBe(200);
      const current = (await getProgram(user))!;
      expect(current.sessions.map(({ date }) => date)).toEqual(
        week.sessions.map(({ date }) => date),
      );
      const finished = current.sessions.find(({ id }) => id === lower.id)!;
      expect(finished).toMatchObject({ revision: 1 });
      expect(finished.exercises.some(({ exerciseId }) => loadsKnee(exerciseId))).toBe(true);
      for (const planned of current.sessions.filter(({ date }) => date > SAT)) {
        expect(planned.revision).toBe(2);
        expect(planned.exercises.some(({ exerciseId }) => loadsKnee(exerciseId))).toBe(false);
      }
      const rows = await sessionRowsOf(api, user.userId);
      expect(rows.filter(({ supersedesId }) => supersedesId !== null)).toHaveLength(ahead.length);
      expect(
        await api.db.select().from(adaptation).where(eq(adaptation.userId, user.userId)),
      ).toEqual([]);
      expect(await pendingRules(user)).toEqual([]);
    });

    it('leaves Sessions that load no such area, and every other kind of flag, alone', async () => {
      const { user, week, details } = await player(SUN);

      await postStopFlag(user, stopFlagOf(StopFlag.Fever, SUN));
      await postStopFlag(user, stopFlagOf(StopFlag.NewPain, SUN, { bodyArea: BodyArea.Neck }));

      const current = (await getProgram(user))!;
      const library = await libraryById(user);
      for (const planned of current.sessions) {
        const original = details.find(({ date }) => date === planned.date)!;
        const touchesNeck = original.exercises.some(({ exerciseId }) =>
          library.get(exerciseId)!.highLoadAreas.includes(BodyArea.Neck),
        );
        expect(planned.revision).toBe(touchesNeck && planned.date >= SUN ? 2 : 1);
      }
      expect(current.sessions).toHaveLength(week.sessions.length);
    });
  });

  describe('privacy', () => {
    it('answers 404 for another user’s suggestion and an id that is not one, changing nothing', async () => {
      const { user, lighten } = await twoSuggestions();
      const stranger = await newUser(api);

      for (const id of [lighten.id, crypto.randomUUID(), 'not-a-uuid']) {
        const accept = await stranger.call(
          HttpMethod.Post,
          adaptationPath(id, AdaptationSubpath.Accept),
          { basis: lighten.basis },
        );
        const decline = await stranger.call(
          HttpMethod.Post,
          adaptationPath(id, AdaptationSubpath.Decline),
        );
        expect(accept.status).toBe(404);
        expect(decline.status).toBe(404);
      }
      expect(await getAdaptations(stranger)).toEqual([]);
      expect(await decisionRows(user)).toEqual([]);
      expect((await getAdaptations(user)).map(({ id }) => id)).toContain(lighten.id);
    });

    it('answers 401 for a decision without a token', async () => {
      const { lighten } = await twoSuggestions();

      const response = await fetch(
        `${api.baseUrl}${adaptationPath(lighten.id, AdaptationSubpath.Decline)}`,
        { method: HttpMethod.Post },
      );

      expect(response.status).toBe(401);
    });

    it('lets the app role neither write another user’s rows nor change or delete its own', async () => {
      const { user, swap, lighten } = await twoSuggestions();
      await postDecline(user, lighten.id);
      const stranger = await newUser(api);

      await expect(
        withUser(api.db, stranger.userId, (tx) =>
          tx.insert(adaptation).values({
            userId: user.userId,
            ruleId: AdaptationRule.RepeatWeek,
            triggerKey: 'x',
            change: swap.change,
            params: {},
            basis: [],
            validUntil: null,
          }),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      await expect(
        withUser(api.db, stranger.userId, (tx) =>
          tx.insert(adaptationDecision).values({
            adaptationId: swap.id,
            userId: user.userId,
            decision: AdaptationStatus.Declined,
          }),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      for (const change of [
        (tx: UserTx) => tx.update(adaptation).set({ ask: 2 }).where(eq(adaptation.id, swap.id)),
        (tx: UserTx) => tx.delete(adaptation).where(eq(adaptation.id, swap.id)),
        (tx: UserTx) =>
          tx
            .update(adaptationDecision)
            .set({ decision: AdaptationStatus.Accepted })
            .where(eq(adaptationDecision.adaptationId, lighten.id)),
        (tx: UserTx) =>
          tx.delete(adaptationDecision).where(eq(adaptationDecision.adaptationId, lighten.id)),
      ]) {
        await expect(withUser(api.db, user.userId, change)).rejects.toMatchObject({
          cause: { code: PG_INSUFFICIENT_PRIVILEGE },
        });
      }
      const seen = await withUser(api.db, stranger.userId, (tx) => tx.select().from(adaptation));
      expect(seen).toEqual([]);
    });

    it('never puts a suggestion, a Check-in or a Session in the request log', async () => {
      logLines.length = 0;
      const { user, swap, lighten } = await twoSuggestions();
      await postAccept(user, lighten);
      await postDecline(user, swap.id);

      expect(logLines.length).toBeGreaterThan(0);
      const logged = logLines.join('\n');
      for (const secret of [
        AdaptationRule.PoorCheckin,
        AdaptationRule.UnplannedActivity,
        AdaptationChangeKind.LightenSession,
        'basis',
        'sleep',
        'params',
      ]) {
        expect(logged).not.toContain(secret);
      }
    });
  });

  describe('the data export and deleting the account', () => {
    /** Two missed Sessions by Tuesday raise a repeated week; accepting it starts a second Block. */
    const repeatedWeek = async () => {
      const fixture = await player(TUE);
      const repeat = await adaptationOf(fixture.user, AdaptationRule.RepeatWeek);
      await acceptedProgram(fixture.user, repeat);
      return { ...fixture, repeat };
    };

    it('lists every suggestion with its decision, oldest first', async () => {
      const { user, swap, lighten } = await twoSuggestions();
      await postDecline(user, lighten.id);
      clock = noon(SAT, 14);
      await acceptedProgram(user, swap);

      const exported = userExportSchema.parse(
        await (await user.call(HttpMethod.Get, ApiPath.MeExport)).json(),
      );

      expect(exported.adaptations).toHaveLength(2);
      expect(
        exported.adaptations.map(({ id, status, triggerKey, ask }) => ({
          id,
          status,
          triggerKey,
          ask,
        })),
      ).toEqual([
        { id: swap.id, status: AdaptationStatus.Accepted, triggerKey: expect.any(String), ask: 1 },
        {
          id: lighten.id,
          status: AdaptationStatus.Declined,
          triggerKey: expect.any(String),
          ask: 1,
        },
      ]);
      expect(exported.adaptations[0]).toMatchObject({
        ruleId: AdaptationRule.UnplannedActivity,
        change: swap.change,
        params: swap.params,
        basis: swap.basis,
        decidedAt: noon(SAT, 14).toISOString(),
      });
      expect(exported.program).toEqual(await getProgram(user));
    });

    it('goes with the account: suggestions, decisions, Sessions and the Blocks of a repeated week', async () => {
      const { user, repeat } = await repeatedWeek();
      expect(await api.db.select().from(block).where(eq(block.userId, user.userId))).toHaveLength(
        2,
      );

      expect((await user.call(HttpMethod.Delete, ApiPath.Me)).status).toBe(204);

      expect(await api.db.select().from(adaptation).where(eq(adaptation.id, repeat.id))).toEqual(
        [],
      );
      expect(await decisionRows(user)).toEqual([]);
      expect(await sessionRowsOf(api, user.userId)).toEqual([]);
      expect(await api.db.select().from(block).where(eq(block.userId, user.userId))).toEqual([]);
    });
  });
});
