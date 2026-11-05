import { ApiPath, exerciseListResponseSchema, type Exercise } from '@stamina/contracts';
import {
  BodyArea,
  DEFAULT_EQUIPMENT,
  Equipment,
  EXERCISE_IMAGE_ORIGIN,
  ExerciseLocation,
  ImageLicence,
  MovementPattern,
  SessionSlot,
} from '@stamina/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HttpHeader } from '../src/enums/http-header.ts';
import { loadExerciseLibrary } from '../src/exercises/node.ts';
import type { TestApi } from './support/safety-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

/** The library is "about 150 exercises" (ticket 07). */
const MIN_EXERCISES = 140;
const MAX_EXERCISES = 160;
/** A person in any of the four places must have a real choice. */
const MIN_PER_LOCATION = 15;
/** Wording a wger image must never carry: those images are not ours to show. */
const FORBIDDEN_IMAGE_SOURCES = ['free-exercise-db', 'yuhonas'];
/** Equipment nobody has at home or on a beach (ticket 07 location tags). */
const GYM_ONLY_EQUIPMENT: readonly Equipment[] = [Equipment.Barbell, Equipment.Machine];

/**
 * The real data files, validated and served through the API. Fails until the curated library is
 * complete; see `docs/development.md` ("Exercise library") for how to fix a finding.
 */
describe('real exercise library', () => {
  let library: Exercise[];
  let api: TestApi;
  let token: string;

  beforeAll(async () => {
    // The shared test database was synced from these same files by the global setup.
    library = await loadExerciseLibrary();
    api = await startTestApi();
    token = await api.signToken(crypto.randomUUID());
  });
  afterAll(() => api.close());

  const list = async (query: string): Promise<Exercise[]> => {
    const response = await fetch(`${api.baseUrl}${ApiPath.Exercises}${query}`, {
      headers: { [HttpHeader.Authorization]: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    return exerciseListResponseSchema.parse(await response.json()).exercises;
  };
  const named = (exercises: readonly Exercise[]) => exercises.map((e) => e.id);

  it('has about 150 exercises, every one valid, with unique ids', () => {
    expect(library.length).toBeGreaterThanOrEqual(MIN_EXERCISES);
    expect(library.length).toBeLessThanOrEqual(MAX_EXERCISES);
    expect(new Set(named(library)).size).toBe(library.length);
  });

  it('is what the API serves, after the migration sync', async () => {
    const served = await list('');
    expect(served).toEqual([...library].sort((a, b) => (a.id < b.id ? -1 : 1)));
  });

  describe('candidates for every slot', () => {
    const scenarios = [
      ['bodyweight only', `equipment=`],
      ['the default equipment', `equipment=${DEFAULT_EQUIPMENT.join(',')}`],
      ['the default equipment at home', `equipment=${DEFAULT_EQUIPMENT.join(',')}&locations=home`],
    ];
    for (const [label, query] of scenarios) {
      it.each(Object.values(SessionSlot))(`has %s exercises for ${label}`, async (slot) => {
        expect((await list(`?${query}&slots=${slot}`)).length).toBeGreaterThan(0);
      });
    }
  });

  describe('every place has a real choice', () => {
    it.each(Object.values(ExerciseLocation))('has enough exercises at %s', (place) => {
      expect(library.filter((e) => e.locations.includes(place)).length).toBeGreaterThanOrEqual(
        MIN_PER_LOCATION,
      );
    });

    it('keeps barbells and machines out of homes and beaches', () => {
      const wrong = library.filter(
        (e) =>
          (e.locations.includes(ExerciseLocation.Home) ||
            e.locations.includes(ExerciseLocation.Beach)) &&
          e.equipment.some((item) => GYM_ONLY_EQUIPMENT.includes(item)),
      );
      expect(named(wrong)).toEqual([]);
    });
  });

  describe('progressions', () => {
    const byId = () => new Map(library.map((e) => [e.id, e]));

    it('keeps the movement pattern along every easier and harder link', () => {
      const index = byId();
      const wrong = library.flatMap((e) =>
        [e.easierId, e.harderId]
          .filter((id): id is string => id !== null)
          .filter((id) => index.get(id)?.movementPattern !== e.movementPattern)
          .map((id) => `${e.id} -> ${id}`),
      );
      expect(wrong).toEqual([]);
    });

    it('never links the same exercise as both easier and harder', () => {
      expect(
        named(library.filter((e) => e.easierId !== null && e.easierId === e.harderId)),
      ).toEqual([]);
    });

    it('has no circular chain of easier links, nor of harder links', () => {
      const index = byId();
      const cyclic: string[] = [];
      for (const e of library) {
        for (const field of ['easierId', 'harderId'] as const) {
          const seen = new Set([e.id]);
          for (let next = e[field]; next !== null; next = index.get(next)?.[field] ?? null) {
            if (seen.has(next)) {
              cyclic.push(`${e.id} (${field})`);
              break;
            }
            seen.add(next);
          }
        }
      }
      expect(cyclic).toEqual([]);
    });
  });

  describe('images', () => {
    const withImage = () => library.filter((e) => e.image !== null);

    it('only come from wger media, never from free-exercise-db', () => {
      for (const e of withImage()) {
        const image = e.image!;
        expect(image.url.startsWith(EXERCISE_IMAGE_ORIGIN), e.id).toBe(true);
        const all = JSON.stringify(image).toLowerCase();
        for (const forbidden of FORBIDDEN_IMAGE_SOURCES) {
          expect(all.includes(forbidden), `${e.id} image mentions ${forbidden}`).toBe(false);
        }
      }
    });

    it('carry an allowed licence, an author and the wger page they come from', () => {
      for (const e of withImage()) {
        const image = e.image!;
        expect(Object.values(ImageLicence), e.id).toContain(image.licence);
        expect(image.author.trim(), e.id).not.toBe('');
        expect(image.sourceUrl, e.id).toBe(
          `https://wger.de/en/exercise/${image.wgerExerciseId}/view/`,
        );
      }
    });
  });

  describe('tags', () => {
    it('never prescribes by reps in reserve an exercise that is only warm-up or cool-down work, or any mobility', () => {
      // An exercise that also has a strength slot (a bodyweight squat in the warm-up and main
      // lifts) may be prescribed by RIR there; one that only ever warms up or cools down never is.
      const prepOnly = (e: Exercise) =>
        e.slots.every((slot) => slot === SessionSlot.WarmUp || slot === SessionSlot.CoolDown);
      const wrong = library.filter(
        (e) => e.rirSuitable && (e.movementPattern === MovementPattern.Mobility || prepOnly(e)),
      );
      expect(named(wrong)).toEqual([]);
    });

    it('lists a high-load area for every exercise, with no exception', () => {
      expect(named(library.filter((e) => e.highLoadAreas.length === 0))).toEqual([]);
    });

    /**
     * What a movement pattern always loads. A person excluding an area relies on these: an
     * exercise of the pattern that forgot the area would be served to someone it can hurt.
     * `all` must all be listed, `any` needs at least one.
     */
    const PATTERN_RULES: ReadonlyArray<{
      pattern: MovementPattern;
      all?: readonly BodyArea[];
      any?: readonly BodyArea[];
    }> = [
      { pattern: MovementPattern.JumpLand, all: [BodyArea.Knee, BodyArea.Ankle] },
      { pattern: MovementPattern.ChangeOfDirection, all: [BodyArea.Knee, BodyArea.Ankle] },
      { pattern: MovementPattern.Push, all: [BodyArea.Shoulder] },
      { pattern: MovementPattern.Overhead, all: [BodyArea.Shoulder] },
      { pattern: MovementPattern.Hinge, any: [BodyArea.Hip, BodyArea.Knee] },
      { pattern: MovementPattern.Lunge, all: [BodyArea.Knee, BodyArea.Hip] },
      { pattern: MovementPattern.Squat, any: [BodyArea.Knee, BodyArea.Ankle] },
    ];

    it.each(PATTERN_RULES)(
      'tags every $pattern exercise with its areas',
      ({ pattern, all, any }) => {
        const ofPattern = library.filter((e) => e.movementPattern === pattern);
        expect(ofPattern.length, pattern).toBeGreaterThan(0);
        const missingAll = ofPattern.filter(
          (e) => all && !all.every((a) => e.highLoadAreas.includes(a)),
        );
        const missingAny = ofPattern.filter(
          (e) => any && !any.some((a) => e.highLoadAreas.includes(a)),
        );
        expect(named(missingAll), `${pattern} missing any of ${all?.join(',')}`).toEqual([]);
        expect(named(missingAny), `${pattern} missing one of ${any?.join(',')}`).toEqual([]);
      },
    );

    it('never returns an exercise that loads an excluded area, for each area, on the real data', async () => {
      for (const area of Object.values(BodyArea)) {
        const result = await list(`?excludeAreas=${area}`);
        expect(
          result.filter((e) => e.highLoadAreas.includes(area)),
          area,
        ).toEqual([]);
        expect(named(result), area).toEqual(
          named(library.filter((e) => !e.highLoadAreas.includes(area))).sort(),
        );
      }
    });
  });
});
