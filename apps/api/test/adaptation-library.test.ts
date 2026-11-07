import {
  AdaptationChangeKind,
  AdaptationRule,
  BodyArea,
  Equipment,
  LaunchSport,
  SessionFocus,
  SessionSlot,
} from '@stamina/domain';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exercise } from '../src/db/schema.ts';
import { EXERCISE_DATA_DIR } from '../src/exercises/node.ts';
import {
  acceptedProgram,
  adaptationOf,
  pendingRules,
  postHardActivity,
  sessionOfFocus,
} from './support/adaptation-fixtures.ts';
import { checkinOf, postCheckin } from './support/checkin-fixtures.ts';
import {
  PROGRAM_NOW,
  approveSport,
  libraryById,
  padelPersona,
  programUser,
} from './support/program-fixtures.ts';
import type { TestApi } from './support/safety-fixtures.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import { readSessionOf, sessionsOf } from './support/session-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

const SAT = '2026-11-07';
const noon = (day: string) => new Date(`${day}T12:00:00.000Z`);

/**
 * The exercise library the real data gives every exercise many high-load areas, so these tests
 * rewrite it in their own database (after the Program is made) to make the one outcome under test
 * possible. Padel on Tuesday and Friday gives Saturday a lower Session (48 hours clear needed), so
 * a hard Activity that day leaves nothing to move to.
 */
describe('Adaptations over a rewritten exercise library', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;
  let clock = PROGRAM_NOW;

  const start = async () => {
    scratch = await createScratchDatabase(EXERCISE_DATA_DIR);
    api = await startTestApi({ databaseUrl: scratch.url, now: () => clock });
    await approveSport(api, LaunchSport.Padel, (profile) => ({
      ...profile,
      recoveryWindowHours: { lower: 48, upper: 24 },
    }));
  };
  const stop = async () => {
    await api.close();
    await scratch.drop();
  };

  /** A padel player with a Program made on `PROGRAM_NOW`; the clock then moves to Saturday noon. */
  const player = async () => {
    clock = PROGRAM_NOW;
    const user = await programUser(api, { submission: padelPersona() });
    const { week, details } = await sessionsOf(user);
    clock = noon(SAT);
    return { user, week, lower: details.find(({ focus }) => focus === SessionFocus.Lower)! };
  };

  describe('when the knee is the only high-load area of a Session’s main lift', () => {
    beforeAll(start);
    afterAll(stop);

    it('suggests swapping the exercises that load the sore area, and accepting replaces them', async () => {
      const { user, lower } = await player();
      const squat = lower.exercises.find(({ slot }) => slot === SessionSlot.MainStrength)!;
      await api.db.update(exercise).set({ highLoadAreas: [] });
      await api.db
        .update(exercise)
        .set({ highLoadAreas: [BodyArea.Knee] })
        .where(eq(exercise.id, squat.exerciseId));
      await postCheckin(user, checkinOf(SAT, { sleep: 4, soreness: 2, energy: 3 }));

      const suggestion = await adaptationOf(user, AdaptationRule.SoreArea);

      expect(suggestion).toMatchObject({
        change: {
          kind: AdaptationChangeKind.SwapExercises,
          sessionId: lower.id,
          areas: [BodyArea.Knee],
        },
        params: { soreness: 2 },
        validUntil: SAT,
      });
      const swapped = sessionOfFocus(await acceptedProgram(user, suggestion), SessionFocus.Lower);
      const library = await libraryById(user);
      expect(swapped.revision).toBe(2);
      expect(swapped.exercises.map(({ slot }) => slot)).toEqual(
        lower.exercises.map(({ slot }) => slot),
      );
      const replaced = swapped.exercises.filter(
        ({ exerciseId }, index) => exerciseId !== lower.exercises[index]!.exerciseId,
      );
      expect(replaced.map(({ slot }) => slot)).toEqual([SessionSlot.MainStrength]);
      for (const { exerciseId } of swapped.exercises) {
        expect(library.get(exerciseId)!.highLoadAreas).not.toContain(BodyArea.Knee);
      }
      const stored = await readSessionOf(user, swapped.id);
      expect(stored.exercises.filter(({ rir }) => rir !== null).length).toBeGreaterThan(0);
    });

    it('is not raised when a Check-in is poor: that one lightens instead', async () => {
      const { user } = await player();
      await postCheckin(user, checkinOf(SAT, { sleep: 1, soreness: 2, energy: 1 }));

      const suggestion = await adaptationOf(user, AdaptationRule.PoorCheckin);

      expect(suggestion.change.kind).toBe(AdaptationChangeKind.LightenSession);
      expect(await pendingRules(user)).toEqual([AdaptationRule.PoorCheckin]);
    });
  });

  describe('when no Recovery Session can be filled', () => {
    beforeAll(start);
    afterAll(stop);

    it('falls back to one set fewer, and accepting drops a set from every exercise that has more than one', async () => {
      const { user, lower } = await player();
      await api.db
        .update(exercise)
        .set({ equipment: [Equipment.Barbell] })
        .where(sql`'cool-down' = any(${exercise.slots})`);
      await postHardActivity(user, SAT);

      const suggestion = await adaptationOf(user, AdaptationRule.UnplannedActivity);
      expect(suggestion.change).toEqual({
        kind: AdaptationChangeKind.DropSet,
        sessionId: lower.id,
      });

      const dropped = sessionOfFocus(await acceptedProgram(user, suggestion), SessionFocus.Lower);
      expect(dropped).toMatchObject({ date: SAT, revision: 2 });
      dropped.exercises.forEach((exercise, index) => {
        const old = lower.exercises[index]!;
        expect(exercise.exerciseId).toBe(old.exerciseId);
        expect(exercise.sets).toBe(Math.max(1, old.sets - 1));
        expect(exercise.rir).toBe(old.rir);
      });
    });
  });
});
