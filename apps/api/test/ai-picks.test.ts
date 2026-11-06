import {
  ApiPath,
  HttpMethod,
  RecordStatus,
  type Exercise,
  type ProgramWeek,
} from '@stamina/contracts';
import {
  BodyArea,
  Goal,
  LaunchSport,
  MovementPattern,
  PickProblem,
  ScreeningQuestion,
  SessionSlot,
} from '@stamina/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AiPurpose,
  AiUnavailableError,
  LlmOutcome,
  unavailableAiProvider,
  type AiRequest,
} from '../src/ai/index.ts';
import { pseudonymizeUser } from '../src/ai/pseudonymize-user.ts';
import { llmCall, session, sessionExercise } from '../src/db/schema.ts';
import { withUser } from '../src/db/with-user.ts';
import { EXERCISE_DATA_DIR } from '../src/exercises/node.ts';
import { PROMPT_DATA_MARKER, SESSION_PICKS_PROMPT_VERSION } from '../src/picks/index.ts';
import { FAKE_AI_MODEL, FAKE_AI_USAGE } from './support/fake-ai.ts';
import {
  PROGRAM_NOW,
  approveSport,
  getProgram,
  libraryById,
  padelPersona,
  postProgram,
  programUser,
  type ProgramUserOptions,
} from './support/program-fixtures.ts';
import { screeningSubmission, type FixtureUser, type TestApi } from './support/safety-fixtures.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import { startTestApi, type TestApiOptions } from './support/test-api.ts';
import { TEST_ENCRYPTION_KEY } from './support/test-encryption-key.ts';

/** What a prompt carries as data, after its fixed instructions. */
interface PromptData {
  goal: string;
  equipment: string[];
  sport: string | null;
  sportKeyMovements: string[] | null;
  slots: { slot: SessionSlot; count: number; candidates: string[] }[];
  recentExerciseIds: string[];
}
interface Pick {
  slot: SessionSlot;
  exerciseId: string;
  reason: string;
}
const dataOf = (request: AiRequest<unknown>): PromptData =>
  JSON.parse(
    request.prompt.slice(request.prompt.indexOf(PROMPT_DATA_MARKER) + PROMPT_DATA_MARKER.length),
  );

/** One well-formed answer for a prompt: `count` candidates per slot, no id twice. */
function answerFor(
  request: AiRequest<unknown>,
  order: (ids: string[]) => string[],
): { picks: Pick[] } {
  const used = new Set<string>();
  return {
    picks: dataOf(request).slots.flatMap(({ slot, count, candidates }) => {
      const chosen = order(candidates.filter((id) => !used.has(id))).slice(0, count);
      for (const id of chosen) used.add(id);
      return chosen.map((exerciseId) => ({ slot, exerciseId, reason: `Fits the ${slot} slot` }));
    }),
  };
}
/** The rules take the first candidates they like; the fake takes the last ones, so the two differ. */
const lastCandidates = (request: AiRequest<unknown>) =>
  answerFor(request, (ids) => [...ids].reverse());

const idsOf = (week: ProgramWeek) =>
  week.sessions.map((planned) => planned.exercises.map((exercise) => exercise.exerciseId));
const allSuggested = (week: ProgramWeek) =>
  week.sessions.every((planned) => planned.exercises.every((exercise) => exercise.suggestedByAi));
const noneSuggested = (week: ProgramWeek) =>
  week.sessions.every((planned) => planned.exercises.every((exercise) => !exercise.suggestedByAi));

describe('AI exercise picks', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;
  const cleanups: (() => Promise<void>)[] = [];

  beforeAll(async () => {
    scratch = await createScratchDatabase(EXERCISE_DATA_DIR);
    api = await startTestApi({ databaseUrl: scratch.url, now: () => PROGRAM_NOW });
    await approveSport(api, LaunchSport.Padel);
  });
  afterAll(async () => {
    for (const cleanup of cleanups) await cleanup();
    await api.close();
    await scratch.drop();
  });

  const generate = async (user: FixtureUser): Promise<ProgramWeek> => {
    const { result } = await postProgram(user);
    if (result.status !== RecordStatus.Saved) throw new Error('expected a Program');
    return result.program;
  };
  /** A fresh padel player, the same for everyone so their rules weeks are identical. */
  const padelPlayer = (options: ProgramUserOptions = {}) =>
    programUser(api, { submission: padelPersona(), ...options });
  const callsOf = async (user: FixtureUser) =>
    api.db
      .select()
      .from(llmCall)
      .where(eq(llmCall.userPseudonym, await pseudonymizeUser(TEST_ENCRYPTION_KEY, user.userId)))
      .orderBy(llmCall.at);
  const sessionsOf = (user: FixtureUser) =>
    api.db.select().from(session).where(eq(session.userId, user.userId)).orderBy(session.date);
  /** Runs `generate` with the fake answering by `answer`, and returns the prompts it was sent. */
  const generateWith = async (
    user: FixtureUser,
    answer: (request: AiRequest<unknown>) => unknown,
  ) => {
    api.ai.respondWith(answer);
    const before = api.ai.calls.length;
    try {
      const week = await generate(user);
      return { week, requests: api.ai.calls.slice(before) };
    } finally {
      api.ai.respondWith(undefined);
    }
  };
  /** The week the rules alone pick: the model fails every call. */
  const rulesWeek = async (): Promise<ProgramWeek> => {
    const { week } = await generateWith(await padelPlayer(), () => {
      throw new Error('model down');
    });
    return week;
  };

  describe('when the model answers well', () => {
    let user: FixtureUser;
    let week: ProgramWeek;
    let requests: AiRequest<unknown>[];

    beforeAll(async () => {
      user = await padelPlayer();
      ({ week, requests } = await generateWith(user, lastCandidates));
    });

    it('fills every slot of every Session with the model’s choices, one call per Session', () => {
      expect(requests).toHaveLength(week.sessions.length);
      week.sessions.forEach((planned, index) => {
        const answer = lastCandidates(requests[index]!).picks;
        expect(planned.exercises.map(({ exerciseId, slot }) => ({ exerciseId, slot }))).toEqual(
          answer.map(({ exerciseId, slot }) => ({ exerciseId, slot })),
        );
      });
    });

    it('labels every exercise as suggested by AI', () => {
      expect(allSuggested(week)).toBe(true);
    });

    it('stores the model, the prompt version and each pick’s reason with the Session', async () => {
      const rows = await sessionsOf(user);
      expect(rows).toHaveLength(week.sessions.length);
      for (const row of rows) {
        expect(row).toMatchObject({
          model: FAKE_AI_MODEL,
          promptVersion: SESSION_PICKS_PROMPT_VERSION,
        });
      }
      const reasons = await api.db
        .select({ reason: sessionExercise.pickReason })
        .from(sessionExercise)
        .where(eq(sessionExercise.userId, user.userId));
      expect(reasons.length).toBe(idsOf(week).flat().length);
      expect(reasons.every(({ reason }) => reason?.startsWith('Fits the'))).toBe(true);
    });

    it('keeps the rules’ dates, focus, slots and length: only the exercises change', async () => {
      const rules = await rulesWeek();
      const shape = (w: ProgramWeek) =>
        w.sessions.map(({ date, focus, minutes, exercises }) => ({
          date,
          focus,
          minutes,
          slots: exercises.map((exercise) => exercise.slot),
        }));
      expect(shape(week)).toEqual(shape(rules));
      expect(idsOf(week)).not.toEqual(idsOf(rules));
    });

    it('tells later Sessions which exercises the week already used', () => {
      expect(dataOf(requests[0]!).recentExerciseIds).toEqual([]);
      const used = new Set(lastCandidates(requests[0]!).picks.map(({ exerciseId }) => exerciseId));
      const later = dataOf(requests[1]!).recentExerciseIds;
      expect(later.length).toBeGreaterThan(0);
      expect(later.every((id) => used.has(id))).toBe(true);
    });

    it('never regenerates stored picks: a repeat request returns them with no model call', async () => {
      const { week: again, requests: asked } = await generateWith(user, (request) =>
        answerFor(request, (ids) => ids),
      );
      expect(asked).toEqual([]);
      expect(again).toEqual(week);
      expect(await getProgram(user)).toEqual(week);
    });
  });

  describe('what a prompt carries', () => {
    it('is the slot spec, candidate and recent ids, sport movements, Goal and equipment, and nothing else', async () => {
      // Limited (a doctor said yes after a heart-condition answer) with an excluded knee: the most
      // health data a person can hold, none of which may reach the prompt.
      const user = await padelPlayer({
        yes: [ScreeningQuestion.HeartCondition],
        doctorOk: true,
        excludedAreas: [BodyArea.Knee],
      });
      const { requests } = await generateWith(user, lastCandidates);
      const library = await libraryById(user);

      expect(requests.length).toBeGreaterThan(0);
      for (const request of requests) {
        const data = dataOf(request);
        expect(Object.keys(data).sort()).toEqual([
          'equipment',
          'goal',
          'recentExerciseIds',
          'slots',
          'sport',
          'sportKeyMovements',
        ]);
        expect(data.goal).toBe(Goal.SportPerformance);
        expect(data.sport).toBe(LaunchSport.Padel);

        // Every id is a library exercise that is safe for this person: the knee is never loaded and
        // Limited mode's jump and change-of-direction work is gone with its sport-support slot.
        expect(data.slots.map(({ slot }) => slot)).not.toContain(SessionSlot.SportSupport);
        const ids = data.slots
          .flatMap(({ candidates }) => candidates)
          .concat(data.recentExerciseIds);
        for (const id of ids) {
          const exercise = library.get(id) as Exercise;
          expect(exercise).toBeDefined();
          expect(exercise.highLoadAreas).not.toContain(BodyArea.Knee);
          expect([MovementPattern.JumpLand, MovementPattern.ChangeOfDirection]).not.toContain(
            exercise.movementPattern,
          );
        }

        const prompt = request.prompt.toLowerCase();
        for (const secret of [
          user.userId,
          String(new Date().getFullYear() - 30),
          'heart',
          'screening',
          'limited',
          'doctor',
          'check-in',
        ]) {
          expect(prompt).not.toContain(secret.toLowerCase());
        }
      }
    });
  });

  describe('validators and fallback', () => {
    let rules: ProgramWeek;
    beforeAll(async () => {
      rules = await rulesWeek();
    });

    it.each<[string, PickProblem, (picks: Pick[]) => Pick[]]>([
      [
        'an id that is not a candidate of its slot',
        PickProblem.NotACandidate,
        (picks) =>
          picks.map((pick, i) => (i === 0 ? { ...pick, exerciseId: 'no-such-exercise' } : pick)),
      ],
      ['too few exercises in a slot', PickProblem.WrongCount, (picks) => picks.slice(1)],
      [
        'the same exercise twice',
        PickProblem.Duplicate,
        (picks) =>
          picks.map((pick, i) =>
            i === 1 ? { ...pick, exerciseId: picks[0]!.exerciseId, slot: picks[0]!.slot } : pick,
          ),
      ],
    ])(
      'refuses %s, retries once, then the rules pick that Session',
      async (_name, problem, damage) => {
        const user = await padelPlayer();
        let asked = 0;
        // The first Session is damaged on both of its attempts; the others are well formed.
        const { week, requests } = await generateWith(user, (request) => {
          asked += 1;
          const answer = lastCandidates(request);
          return asked <= 2 ? { picks: damage(answer.picks) } : answer;
        });

        expect(requests).toHaveLength(2 + (week.sessions.length - 1));
        expect(idsOf(week)[0]).toEqual(idsOf(rules)[0]);
        expect(week.sessions[0]!.exercises.some((exercise) => exercise.suggestedByAi)).toBe(false);
        expect(week.sessions.slice(1).every((s) => s.exercises.every((e) => e.suggestedByAi))).toBe(
          true,
        );
        const rows = await sessionsOf(user);
        expect(rows[0]).toMatchObject({ model: null, promptVersion: null });
        expect(rows.slice(1).every((row) => row.model === FAKE_AI_MODEL)).toBe(true);
        expect(
          (await callsOf(user)).slice(0, 2).map(({ outcome, detail }) => ({ outcome, detail })),
        ).toEqual([
          { outcome: LlmOutcome.Rejected, detail: problem },
          { outcome: LlmOutcome.Rejected, detail: problem },
        ]);
      },
    );

    it('uses the retry’s answer when the first is refused and the second is valid', async () => {
      const user = await padelPlayer();
      let asked = 0;
      const { week, requests } = await generateWith(user, (request) => {
        asked += 1;
        return asked === 1 ? { picks: [] } : lastCandidates(request);
      });

      expect(requests).toHaveLength(week.sessions.length + 1);
      expect(allSuggested(week)).toBe(true);
      expect((await callsOf(user)).slice(0, 2).map((call) => call.outcome)).toEqual([
        LlmOutcome.Rejected,
        LlmOutcome.Accepted,
      ]);
    });

    it('treats an answer that breaks the schema as a failed call that still costs, then falls back', async () => {
      const user = await padelPlayer();
      const { week } = await generateWith(user, () => ({
        picks: [{ slot: 'not-a-slot', exerciseId: 1 }],
      }));

      expect(idsOf(week)).toEqual(idsOf(rules));
      const calls = await callsOf(user);
      expect(calls).toHaveLength(week.sessions.length * 2);
      for (const call of calls) {
        expect(call).toMatchObject({
          outcome: LlmOutcome.Failed,
          detail: 'malformed',
          costMicroUsd: FAKE_AI_USAGE.costMicroUsd,
        });
      }
    });

    it('falls back when the provider errors, logging the failed calls at no cost', async () => {
      const user = await padelPlayer();
      const { week } = await generateWith(user, () => {
        throw new Error('model down');
      });

      expect(idsOf(week)).toEqual(idsOf(rules));
      const calls = await callsOf(user);
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        expect(call).toMatchObject({
          outcome: LlmOutcome.Failed,
          costMicroUsd: 0,
          model: 'unknown',
        });
      }
    });
  });

  describe('accounting', () => {
    it('logs every call with purpose, model, tokens, cost and a pseudonym, never the user id', async () => {
      const user = await padelPlayer();
      const { week } = await generateWith(user, lastCandidates);

      const calls = await callsOf(user);
      expect(calls).toHaveLength(week.sessions.length);
      for (const call of calls) {
        expect(call).toMatchObject({
          purpose: 'session-picks',
          model: FAKE_AI_MODEL,
          inputTokens: FAKE_AI_USAGE.inputTokens,
          outputTokens: FAKE_AI_USAGE.outputTokens,
          costMicroUsd: FAKE_AI_USAGE.costMicroUsd,
          outcome: LlmOutcome.Accepted,
          detail: null,
        });
        expect(call.userPseudonym).toMatch(/^[0-9a-f]{64}$/);
      }
      expect(JSON.stringify(await api.db.select().from(llmCall))).not.toContain(user.userId);
    });

    it('keeps the call log out of reach of the app role', async () => {
      const user = await padelPlayer();
      await expect(
        withUser(api.db, user.userId, (tx) => tx.select().from(llmCall)),
      ).rejects.toThrow();
    });
  });

  describe('caps', () => {
    /** An API of its own on its own database, so earlier spend and calls do not count. */
    const ownApi = async (options: TestApiOptions) => {
      const database = await createScratchDatabase(EXERCISE_DATA_DIR);
      const own = await startTestApi({
        databaseUrl: database.url,
        now: () => PROGRAM_NOW,
        ...options,
      });
      cleanups.push(async () => {
        await own.close();
        await database.drop();
      });
      await approveSport(own, LaunchSport.Padel);
      return own;
    };
    const modelsOf = async (own: TestApi, user: FixtureUser) =>
      (
        await own.db
          .select()
          .from(session)
          .where(eq(session.userId, user.userId))
          .orderBy(session.date)
      ).map((row) => row.model);

    it('stops asking after a person’s daily calls and the rest of the week is the rules’', async () => {
      const own = await ownApi({ aiLimits: { userCallsPerDay: 2 } });
      own.ai.respondWith(lastCandidates);
      const user = await programUser(own, { submission: padelPersona() });
      await postProgram(user);

      expect(own.ai.calls).toHaveLength(2);
      expect(await modelsOf(own, user)).toEqual([FAKE_AI_MODEL, FAKE_AI_MODEL, null]);
    });

    it('gives every person their own allowance', async () => {
      const own = await ownApi({ aiLimits: { userCallsPerDay: 3 } });
      own.ai.respondWith(lastCandidates);
      await postProgram(await programUser(own, { submission: padelPersona() }));
      await postProgram(await programUser(own, { submission: padelPersona() }));
      expect(own.ai.calls).toHaveLength(6);
    });

    it('counts a person’s calls from the start of the UTC day only', async () => {
      const own = await ownApi({ aiLimits: { userCallsPerDay: 2 } });
      own.ai.respondWith(lastCandidates);
      const user = await programUser(own, { submission: padelPersona() });
      const pseudonym = await pseudonymizeUser(TEST_ENCRYPTION_KEY, user.userId);
      const logged = (at: Date) => ({
        at,
        userPseudonym: pseudonym,
        purpose: AiPurpose.SessionPicks,
        model: FAKE_AI_MODEL,
        inputTokens: 0,
        outputTokens: 0,
        costMicroUsd: 0,
        outcome: LlmOutcome.Accepted,
      });
      // Two calls just before midnight UTC do not count; one just after it does.
      const midnight = Date.UTC(2026, 10, 5);
      await own.db
        .insert(llmCall)
        .values([
          logged(new Date(midnight - 2_000)),
          logged(new Date(midnight - 1_000)),
          logged(new Date(midnight + 1_000)),
        ]);
      await postProgram(user);

      expect(own.ai.calls).toHaveLength(1);
    });

    it('falls back to rules for everyone once the month’s spend reaches 80 % of the cap', async () => {
      // Cap 1,000 micro-dollars, every call costs 500: the second call takes the spend to 1,000.
      const own = await ownApi({ aiLimits: { monthlyCapMicroUsd: 1_000 } });
      own.ai.respondWith(lastCandidates, { ...FAKE_AI_USAGE, costMicroUsd: 500 });
      const user = await programUser(own, { submission: padelPersona() });
      await postProgram(user);
      expect(own.ai.calls).toHaveLength(2);
      expect(await modelsOf(own, user)).toEqual([FAKE_AI_MODEL, FAKE_AI_MODEL, null]);

      const other = await programUser(own, { submission: padelPersona() });
      await postProgram(other);
      expect(own.ai.calls).toHaveLength(2);
      expect((await modelsOf(own, other)).every((model) => model === null)).toBe(true);
    });

    it('with the unavailable provider of Phase A makes no call and writes no log row', async () => {
      const own = await ownApi({ aiProvider: unavailableAiProvider });
      const user = await programUser(own, { submission: padelPersona() });
      const { result } = await postProgram(user);
      if (result.status !== RecordStatus.Saved) throw new Error('expected a Program');

      expect(own.ai.calls).toHaveLength(0);
      expect(await own.db.select().from(llmCall)).toEqual([]);
      expect(noneSuggested(result.program)).toBe(true);
      await expect(unavailableAiProvider.generateObject({} as never)).rejects.toBeInstanceOf(
        AiUnavailableError,
      );
    });
  });

  describe('when the person’s Screening changes while the model is answering', () => {
    it('drops the picks and stores the rules’ week for the new exclusions', async () => {
      const user = await padelPlayer();
      const library = await libraryById(user);
      let changed = false;
      const { week } = await generateWith(user, async (request) => {
        if (!changed) {
          changed = true;
          const saved = await user.call(
            HttpMethod.Post,
            ApiPath.Screening,
            screeningSubmission([ScreeningQuestion.BoneJointMuscle], {
              bodyAreas: [BodyArea.Knee],
            }),
          );
          expect(saved.status).toBe(200);
        }
        return lastCandidates(request);
      });

      expect(noneSuggested(week)).toBe(true);
      for (const planned of week.sessions) {
        for (const exercise of planned.exercises) {
          expect(library.get(exercise.exerciseId)!.highLoadAreas).not.toContain(BodyArea.Knee);
        }
      }
      const rows = await sessionsOf(user);
      expect(rows.every((row) => row.model === null && row.promptVersion === null)).toBe(true);
    });
  });

  describe('two simultaneous requests', () => {
    it('store one Program and both return it', async () => {
      const user = await padelPlayer();
      api.ai.respondWith(lastCandidates);
      const [a, b] = await Promise.all([postProgram(user), postProgram(user)]);
      api.ai.respondWith(undefined);

      expect(a.status).toBe(200);
      expect(b.status).toBe(200);
      expect(a.result).toEqual(b.result);
      if (a.result.status !== RecordStatus.Saved) throw new Error('expected a Program');
      expect(await sessionsOf(user)).toHaveLength(a.result.program.sessions.length);
    });
  });
});
