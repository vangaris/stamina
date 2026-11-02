import { ApiPath, exerciseListResponseSchema, type Exercise } from '@stamina/contracts';
import { BodyArea, Equipment, ExerciseLocation, SessionSlot } from '@stamina/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exercise } from '../src/db/schema.ts';
import { withUser } from '../src/db/with-user.ts';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { HttpHeader } from '../src/enums/http-header.ts';
import { loadExerciseLibrary } from '../src/exercises/node.ts';
import { FIXTURE_LIBRARY_DIR } from './support/exercise-library-dir.ts';
import { createScratchDatabase, type ScratchDatabase } from './support/scratch-database.ts';
import { PG_INSUFFICIENT_PRIVILEGE, type TestApi } from './support/safety-fixtures.ts';
import { startTestApi } from './support/test-api.ts';

const AREAS = Object.values(BodyArea);
/** Plain byte order, as the API sorts (ids are lowercase ascii with hyphens). */
const byId = (a: Exercise, b: Exercise) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

describe('GET /exercises', () => {
  let api: TestApi;
  let scratch: ScratchDatabase;
  let library: Exercise[];
  let token: string;

  beforeAll(async () => {
    library = (await loadExerciseLibrary(FIXTURE_LIBRARY_DIR)).sort(byId);
    scratch = await createScratchDatabase(FIXTURE_LIBRARY_DIR);
    api = await startTestApi({ databaseUrl: scratch.url });
    token = await api.signToken(crypto.randomUUID());
  });
  afterAll(async () => {
    await api.close();
    await scratch.drop();
  });

  const get = (query = '', withToken: string | null = token) =>
    fetch(`${api.baseUrl}${ApiPath.Exercises}${query}`, {
      headers: withToken === null ? {} : { [HttpHeader.Authorization]: `Bearer ${withToken}` },
    });
  const list = async (query = ''): Promise<Exercise[]> => {
    const response = await get(query);
    expect(response.status).toBe(200);
    return exerciseListResponseSchema.parse(await response.json()).exercises;
  };
  const ids = (exercises: readonly Exercise[]) => exercises.map((e) => e.id);
  /** What the filter must return, written without the domain's `selectExercises`. */
  const expected = (keep: (e: Exercise) => boolean) => ids(library.filter(keep));

  it('has a fixture library worth filtering', () => {
    expect(library.length).toBeGreaterThanOrEqual(20);
    for (const area of AREAS) {
      expect(library.some((e) => e.highLoadAreas.includes(area))).toBe(true);
      expect(library.some((e) => !e.highLoadAreas.includes(area))).toBe(true);
    }
  });

  describe('access', () => {
    it('answers 401 without a token and with a bad one', async () => {
      expect((await get('', null)).status).toBe(401);
      expect((await get('', 'not-a-jwt')).status).toBe(401);
    });

    it('answers the whole library, ordered by id, in the contract shape, to any signed-in user', async () => {
      const all = await list();
      expect(all).toEqual(library);
      expect(all.find((e) => e.id === 'push-up')?.image).toMatchObject({
        author: 'Fixture Author',
        licence: 'CC-BY-SA 4.0',
      });
    });
  });

  describe('equipment', () => {
    it('treats the list as what the person has: an exercise passes only if everything it needs is listed', async () => {
      const dumbbells = await list('?equipment=dumbbell');
      expect(ids(dumbbells)).toEqual(
        expected((e) => e.equipment.every((x) => x === Equipment.Dumbbell)),
      );
      expect(ids(dumbbells)).toContain('goblet-squat');
      expect(ids(dumbbells)).toContain('push-up');
      // Needs a bench too, so a person with only dumbbells does not get it.
      expect(ids(dumbbells)).not.toContain('dumbbell-bench-press');
      expect(ids(dumbbells)).not.toContain('barbell-back-squat');
    });

    it('adds the exercises that need the extra item once it is listed', async () => {
      const result = await list('?equipment=dumbbell,bench');
      expect(ids(result)).toContain('dumbbell-bench-press');
      expect(ids(result)).toEqual(
        expected((e) =>
          e.equipment.every((x) => x === Equipment.Dumbbell || x === Equipment.Bench),
        ),
      );
    });

    it('returns bodyweight exercises only for an empty equipment list', async () => {
      const bodyweight = await list('?equipment=');
      expect(bodyweight.length).toBeGreaterThan(0);
      expect(bodyweight.every((e) => e.equipment.length === 0)).toBe(true);
      expect(ids(bodyweight)).toEqual(expected((e) => e.equipment.length === 0));
    });

    it('does not limit by equipment when the parameter is absent', async () => {
      expect(ids(await list('?locations=gym'))).toEqual(
        expected((e) => e.locations.includes(ExerciseLocation.Gym)),
      );
      expect(ids(await list())).toEqual(ids(library));
    });
  });

  describe('locations and slots', () => {
    it.each(Object.values(ExerciseLocation))('keeps what works at %s', async (place) => {
      const result = await list(`?locations=${place}`);
      expect(result.length).toBeGreaterThan(0);
      expect(ids(result)).toEqual(expected((e) => e.locations.includes(place)));
    });

    it('keeps an exercise that works in any listed location', async () => {
      expect(ids(await list('?locations=beach,court'))).toEqual(
        expected((e) => e.locations.some((l) => l === 'beach' || l === 'court')),
      );
    });

    it.each(Object.values(SessionSlot))('keeps what suits the %s slot', async (slot) => {
      const result = await list(`?slots=${slot}`);
      expect(result.length).toBeGreaterThan(0);
      expect(ids(result)).toEqual(expected((e) => e.slots.includes(slot)));
    });

    it('keeps an exercise that suits any listed slot', async () => {
      expect(ids(await list('?slots=warm-up,cool-down'))).toEqual(
        expected((e) => e.slots.some((s) => s === 'warm-up' || s === 'cool-down')),
      );
    });
  });

  describe('combined', () => {
    it('applies equipment, location, slot and excluded areas together', async () => {
      const result = await list(
        '?equipment=dumbbell,bench&locations=home&slots=main-strength&excludeAreas=knee',
      );
      expect(ids(result)).toEqual(
        expected(
          (e) =>
            e.equipment.every((x) => x === 'dumbbell' || x === 'bench') &&
            e.locations.includes(ExerciseLocation.Home) &&
            e.slots.includes(SessionSlot.MainStrength) &&
            !e.highLoadAreas.includes(BodyArea.Knee),
        ),
      );
      expect(ids(result)).toContain('dumbbell-bench-press');
      expect(ids(result)).not.toContain('goblet-squat');
    });

    it('returns an empty list, not an error, when nothing matches', async () => {
      expect(
        await list('?equipment=&slots=cool-down&excludeAreas=neck,hip,upper-back,wrist'),
      ).toEqual([]);
    });
  });

  describe('excluded body areas', () => {
    it.each(AREAS)(
      'never returns an exercise that loads %s, and returns exactly the rest',
      async (area) => {
        const result = await list(`?excludeAreas=${area}`);
        expect(result.some((e) => e.highLoadAreas.includes(area))).toBe(false);
        expect(ids(result)).toEqual(expected((e) => !e.highLoadAreas.includes(area)));
        expect(result.length).toBeGreaterThan(0);
        expect(result.length).toBeLessThan(library.length);
      },
    );

    it.each(AREAS)('still excludes %s whatever else matches', async (area) => {
      const everything = `equipment=${Object.values(Equipment).join(',')}&locations=${Object.values(ExerciseLocation).join(',')}&slots=${Object.values(SessionSlot).join(',')}`;
      const result = await list(`?${everything}&excludeAreas=${area}`);
      expect(result.some((e) => e.highLoadAreas.includes(area))).toBe(false);
      expect(ids(result)).toEqual(expected((e) => !e.highLoadAreas.includes(area)));
    });

    it('removes an exercise that loads any of several excluded areas', async () => {
      const result = await list('?excludeAreas=knee,shoulder,lower-back');
      expect(
        result.some((e) =>
          e.highLoadAreas.some((a) => ['knee', 'shoulder', 'lower-back'].includes(a)),
        ),
      ).toBe(false);
      expect(ids(result)).toEqual(
        expected(
          (e) => !e.highLoadAreas.some((a) => ['knee', 'shoulder', 'lower-back'].includes(a)),
        ),
      );
    });

    it('removes everything when every area is excluded, except exercises that load none', async () => {
      const result = await list(`?excludeAreas=${AREAS.join(',')}`);
      expect(result.every((e) => e.highLoadAreas.length === 0)).toBe(true);
      expect(ids(result)).toEqual(expected((e) => e.highLoadAreas.length === 0));
    });

    it('does not narrow anything for an empty excludeAreas', async () => {
      expect(ids(await list('?excludeAreas='))).toEqual(ids(library));
    });
  });

  describe('bad queries', () => {
    it.each([
      ['equipment', 'trampoline'],
      ['locations', 'moon'],
      ['slots', 'siesta'],
      ['excludeAreas', 'elbows'],
    ])(
      'answers 400 invalid_request for an unknown %s value, without echoing it',
      async (key, value) => {
        const response = await get(`?${key}=${value}`);
        expect(response.status).toBe(400);
        const text = await response.text();
        expect(JSON.parse(text)).toEqual({ error: ApiErrorCode.InvalidRequest });
        expect(text).not.toContain(value);
      },
    );

    it('answers 400 when one value of a list is unknown', async () => {
      expect((await get('?equipment=dumbbell,trampoline')).status).toBe(400);
    });

    it.each([
      ['equipment', 'dumbbell', 'barbell'],
      ['locations', 'home', 'gym'],
      ['slots', 'warm-up', 'cool-down'],
      ['excludeAreas', 'knee', 'hip'],
      ['excludeAreas', '', 'knee'],
      ['excludeAreas', 'knee', ''],
      ['excludeAreas', 'knee', 'knee'],
    ])(
      'answers 400 when %s is given twice (%j and %j), never keeping one value',
      async (key, a, b) => {
        const response = await get(`?${key}=${a}&${key}=${b}`);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
      },
    );

    it('accepts a repeated value inside one comma list', async () => {
      expect(ids(await list('?excludeAreas=knee,knee'))).toEqual(
        ids(await list('?excludeAreas=knee')),
      );
    });

    it.each(['Knee', 'knee,', ',knee', 'knee,,hip'])(
      'answers 400 for the malformed list excludeAreas=%s',
      async (value) => {
        expect((await get(`?excludeAreas=${value}`)).status).toBe(400);
      },
    );

    it.each(['excludedAreas=knee', 'exclude_areas=knee', 'area=knee', 'excludeAreas=knee&x=1'])(
      'answers 400 for the unknown query key in ?%s, never returning everything',
      async (query) => {
        const response = await get(`?${query}`);
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: ApiErrorCode.InvalidRequest });
      },
    );
  });

  describe('who may write', () => {
    it('lets the app role read the library but not insert, update or delete a row', async () => {
      const userId = crypto.randomUUID();
      const [any] = library;
      const before = await api.db.select().from(exercise);

      await expect(
        withUser(api.db, userId, (tx) =>
          tx.insert(exercise).values({
            id: 'sneaked-in',
            source: any!.source,
            sourceId: 'x',
            licence: any!.licence,
            nameEn: 'Sneaked in',
            instructionsEn: ['x'],
            equipment: [],
            locations: [ExerciseLocation.Home],
            movementPattern: any!.movementPattern,
            highLoadAreas: [],
            slots: [SessionSlot.WarmUp],
            rirSuitable: false,
          }),
        ),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      await expect(
        withUser(api.db, userId, (tx) => tx.update(exercise).set({ highLoadAreas: [] })),
      ).rejects.toMatchObject({ cause: { code: PG_INSUFFICIENT_PRIVILEGE } });
      await expect(withUser(api.db, userId, (tx) => tx.delete(exercise))).rejects.toMatchObject({
        cause: { code: PG_INSUFFICIENT_PRIVILEGE },
      });

      expect(await api.db.select().from(exercise)).toEqual(before);
      expect(await withUser(api.db, userId, (tx) => tx.select().from(exercise))).toHaveLength(
        library.length,
      );
    });
  });
});
