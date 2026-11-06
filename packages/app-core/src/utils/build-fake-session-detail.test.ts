import { Emphasis, LoadGuidance } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { FAKE_SESSION } from '../config.ts';
import { buildFakeSessionDetail } from './build-fake-session-detail.ts';
import { testFakeSession as session } from '../testing/test-fake-session.ts';

describe('buildFakeSessionDetail', () => {
  const detail = buildFakeSessionDetail(session, Emphasis.Strength, [], null);

  it('keeps the Session and gives every exercise a unique uuid id', () => {
    const ids = detail.exercises.map((exercise) => exercise.id);

    expect(detail).toMatchObject({ id: session.id, minutes: session.minutes, finished: null });
    expect(new Set(ids).size).toBe(session.exercises.length);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('tags easier and harder variants on RPE-guided exercises only', () => {
    for (const exercise of detail.exercises) {
      const guided = exercise.loadGuidance === LoadGuidance.RpeGuided;
      expect(exercise.easier !== null).toBe(guided);
      expect(exercise.harder !== null).toBe(guided);
      expect(exercise.suggestedWeightKg).toBeNull();
      expect(exercise.progression).toBeNull();
    }
  });

  it('names variants like exercises, without the Easier/Harder label the swap sheet adds', () => {
    const main = detail.exercises.find((exercise) => exercise.easier !== null);
    if (!main?.easier || !main.harder) throw new Error('no RPE-guided exercise');

    expect(main.easier.name).toEqual({ en: `${main.name.en} (supported)`, el: null });
    expect(main.harder.name).toEqual({ en: `${main.name.en} (loaded)`, el: null });
  });

  it('puts each logged set on the exercise it was done for, a variant included, in set order', () => {
    const main = detail.exercises.find((exercise) => exercise.easier !== null);
    if (!main?.easier) throw new Error('no RPE-guided exercise');
    const set = (id: string, exerciseId: string, setNumber: number) => ({
      id,
      exerciseId,
      setNumber,
      weightKg: 20,
      reps: 5,
      rpe: 8,
    });

    const logged = buildFakeSessionDetail(
      session,
      Emphasis.Strength,
      [set('b', main.easier.exerciseId, 2), set('a', main.exerciseId, 1), set('c', 'unrelated', 1)],
      null,
    );

    expect(logged.exercises.find((e) => e.id === main.id)?.loggedSets.map((s) => s.id)).toEqual([
      'a',
      'b',
    ]);
    expect(logged.exercises.flatMap((e) => e.loggedSets)).toHaveLength(2);
    expect(main.easier.exerciseId.endsWith(FAKE_SESSION.easier.idSuffix)).toBe(true);
  });
});
