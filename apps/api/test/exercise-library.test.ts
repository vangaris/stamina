import type { Exercise } from '@stamina/contracts';
import { BodyArea, ExerciseLocation, SessionSlot } from '@stamina/domain';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exercise } from '../src/db/schema.ts';
import { runMigrations } from '../src/db/migrate.ts';
import { createPgDb } from '../src/db/pg-client.ts';
import type { DbHandle } from '../src/db/types.ts';
import { toExercise } from '../src/exercises/index.ts';
import {
  ExerciseLibraryError,
  loadExerciseLibrary,
  syncExerciseLibrary,
} from '../src/exercises/node.ts';
import {
  copyFixtureLibrary,
  FIXTURE_LIBRARY_DIR,
  type FixtureLibraryCopy,
} from './support/exercise-library-dir.ts';
import {
  createEmptyDatabase,
  createScratchDatabase,
  type ScratchDatabase,
} from './support/scratch-database.ts';

/** SQLSTATE 23514: a check constraint failed. */
const PG_CHECK_VIOLATION = '23514';
/** SQLSTATE 23503: a foreign key failed. */
const PG_FOREIGN_KEY_VIOLATION = '23503';

const WGER_IMAGE = {
  url: 'https://wger.de/media/exercise-images/1/x.png',
  author: 'Someone',
  authorUrl: null,
  licence: 'CC-BY-SA 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  sourceUrl: 'https://wger.de/en/exercise/1/view/',
  wgerExerciseId: 1,
};

const byId = (a: Exercise, b: Exercise) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

describe('exercise library loader', () => {
  let library: Exercise[];
  beforeAll(async () => {
    library = await loadExerciseLibrary(FIXTURE_LIBRARY_DIR);
  });

  const withCopy = async (run: (copy: FixtureLibraryCopy) => Promise<void>) => {
    const copy = await copyFixtureLibrary();
    try {
      await run(copy);
    } finally {
      await copy.remove();
    }
  };
  const loadError = async (dir: string) => {
    const error = await loadExerciseLibrary(dir).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ExerciseLibraryError);
    return (error as Error).message;
  };

  it('reads every json file of the directory, in file-name order, and nothing else', async () => {
    expect(library.length).toBeGreaterThanOrEqual(25);
    // mobility.json sorts before strength.json.
    expect(library[0]?.id).toBe('worlds-greatest-stretch');
    expect(library.some((e) => e.id === 'push-up')).toBe(true);
    await withCopy(async (copy) => {
      await copy.write('notes.txt', 'not json');
      await copy.write('README.md', '# not json');
      expect(await loadExerciseLibrary(copy.dir)).toEqual(library);
    });
  });

  it('accepts a link to an exercise in another file', async () => {
    await withCopy(async (copy) => {
      await copy.write('extra.json', [
        { ...library.find((e) => e.id === 'plank')!, id: 'plank-on-knees', harderId: 'plank' },
      ]);
      expect(await loadExerciseLibrary(copy.dir)).toHaveLength(library.length + 1);
    });
  });

  it('rejects a duplicate id across files, naming both files and the id', async () => {
    await withCopy(async (copy) => {
      await copy.write('zzz.json', [library.find((e) => e.id === 'push-up')]);
      const message = await loadError(copy.dir);
      expect(message).toContain('duplicate id "push-up"');
      expect(message).toContain('strength.json');
      expect(message).toContain('zzz.json');
    });
  });

  it('rejects a duplicate id inside one file', async () => {
    await withCopy(async (copy) => {
      const twin = library.find((e) => e.id === 'plank')!;
      await copy.write('twins.json', [twin, twin]);
      expect(await loadError(copy.dir)).toContain('twins.json: duplicate id "plank"');
    });
  });

  it('rejects an easier or harder link to an id that is not in the library', async () => {
    await withCopy(async (copy) => {
      await copy.write('dangling.json', [
        { ...library.find((e) => e.id === 'plank')!, id: 'plank-a', easierId: 'no-such-exercise' },
        { ...library.find((e) => e.id === 'plank')!, id: 'plank-b', harderId: 'also-missing' },
      ]);
      const message = await loadError(copy.dir);
      expect(message).toContain(
        'dangling.json: exercise "plank-a" easierId "no-such-exercise" is not in the library',
      );
      expect(message).toContain(
        'dangling.json: exercise "plank-b" harderId "also-missing" is not in the library',
      );
    });
  });

  it('rejects a link that points at its own exercise', async () => {
    await withCopy(async (copy) => {
      await copy.write('self.json', [
        { ...library.find((e) => e.id === 'plank')!, id: 'plank-loop', harderId: 'plank-loop' },
      ]);
      expect(await loadError(copy.dir)).toContain(
        'self.json: exercise "plank-loop" harderId points at itself',
      );
    });
  });

  it('rejects an entry that fails the schema, naming the file, the id and the field', async () => {
    await withCopy(async (copy) => {
      await copy.write('bad.json', [
        { ...library.find((e) => e.id === 'plank')!, id: 'plank-bad', slots: ['siesta'] },
      ]);
      const message = await loadError(copy.dir);
      expect(message).toContain('bad.json: exercise "plank-bad" slots.0');
    });
  });

  it('rejects a file that is not JSON, and reports every problem at once', async () => {
    await withCopy(async (copy) => {
      await copy.write('broken.json', '[{');
      await copy.write('zzz.json', [library.find((e) => e.id === 'push-up')]);
      const message = await loadError(copy.dir);
      expect(message).toContain('broken.json: not readable JSON');
      expect(message).toContain('duplicate id "push-up"');
    });
  });

  it('rejects a data directory that does not exist', async () => {
    await expect(loadExerciseLibrary('/nonexistent/stamina-library')).rejects.toThrow();
  });
});

describe('exercise library sync', () => {
  let scratch: ScratchDatabase;
  let handle: DbHandle;
  let library: Exercise[];

  beforeAll(async () => {
    library = await loadExerciseLibrary(FIXTURE_LIBRARY_DIR);
    scratch = await createScratchDatabase(FIXTURE_LIBRARY_DIR);
    handle = createPgDb(scratch.url);
  });
  afterAll(async () => {
    await handle.close();
    await scratch.drop();
  });

  const stored = async () =>
    (
      await handle.db
        .select()
        .from(exercise)
        .orderBy(sql`${exercise.id} collate "C"`)
    ).map(toExercise);
  const sorted = (exercises: readonly Exercise[]) => [...exercises].sort(byId);
  const sync = (exercises: readonly Exercise[]) => syncExerciseLibrary(handle.db, exercises);
  const byIdMap = (exercises: readonly Exercise[]) => new Map(exercises.map((e) => [e.id, e]));

  it('has written the whole library, links included, when the database was migrated', async () => {
    expect(await stored()).toEqual(sorted(library));
    const pushUp = (await stored()).find((e) => e.id === 'push-up');
    expect(pushUp?.easierId).toBe('incline-push-up');
  });

  it('is idempotent', async () => {
    await sync(library);
    await sync(library);
    expect(await stored()).toEqual(sorted(library));
    expect(await handle.db.select({ n: sql<number>`count(*)::int` }).from(exercise)).toEqual([
      { n: library.length },
    ]);
  });

  it('writes links to rows that come later in the data, and in the other direction', async () => {
    const reversed = [...library].reverse();
    await handle.db.delete(exercise);
    await sync(reversed);
    expect(await stored()).toEqual(sorted(library));
  });

  it('updates a changed exercise, including clearing a link and an image', async () => {
    const changed = library.map((e) =>
      e.id === 'push-up'
        ? {
            ...e,
            name: { en: 'Press-Up', el: 'Κάμψεις' },
            highLoadAreas: [...e.highLoadAreas, BodyArea.Neck],
            easierId: null,
            image: null,
          }
        : e,
    );
    await sync(changed);
    expect(byIdMap(await stored()).get('push-up')).toEqual(byIdMap(changed).get('push-up'));
    await sync(library);
    expect(await stored()).toEqual(sorted(library));
  });

  it('removes rows whose id is no longer in the data', async () => {
    const without = library.filter((e) => e.id !== 'plank' && e.id !== 'lat-pulldown');
    await sync(without);
    expect((await stored()).map((e) => e.id)).toEqual(sorted(without).map((e) => e.id));
    await sync(library);
    expect(await stored()).toEqual(sorted(library));
  });

  it('removes a row that other rows (also removed, or re-linked) pointed at', async () => {
    const kept = library
      .filter((e) => e.id !== 'incline-push-up' && e.id !== 'barbell-back-squat')
      .map((e) => ({
        ...e,
        easierId:
          e.easierId === 'incline-push-up' || e.easierId === 'barbell-back-squat'
            ? null
            : e.easierId,
        harderId:
          e.harderId === 'incline-push-up' || e.harderId === 'barbell-back-squat'
            ? null
            : e.harderId,
      }));
    await sync(kept);
    expect(await stored()).toEqual(sorted(kept));
    await sync(library);
  });

  it('leaves the table untouched when a link is dangling (one transaction)', async () => {
    const broken = library.map((e) =>
      e.id === 'push-up' ? { ...e, easierId: 'no-such-exercise' } : e,
    );
    await expect(sync(broken)).rejects.toMatchObject({ cause: { code: PG_FOREIGN_KEY_VIOLATION } });
    expect(await stored()).toEqual(sorted(library));
  });

  it('empties the table for an empty library', async () => {
    await sync([]);
    expect(await stored()).toEqual([]);
    await sync(library);
    expect(await stored()).toEqual(sorted(library));
  });

  describe('table constraints (owner writes)', () => {
    const base = () => ({
      id: 'constraint-probe',
      source: library[0]!.source,
      sourceId: 'probe',
      licence: library[0]!.licence,
      nameEn: 'Probe',
      instructionsEn: ['Probe.'],
      equipment: [],
      locations: [ExerciseLocation.Home],
      movementPattern: library[0]!.movementPattern,
      highLoadAreas: [],
      slots: [SessionSlot.WarmUp],
      rirSuitable: false,
    });
    const insert = (values: Record<string, unknown>) =>
      handle.db.insert(exercise).values({ ...base(), ...values });

    it('accepts the probe row', async () => {
      await insert({ image: WGER_IMAGE });
      await handle.db.delete(exercise).where(sql`${exercise.id} = 'constraint-probe'`);
    });

    it.each([
      ['an unknown equipment', { equipment: ['trampoline'] }],
      ['an unknown location', { locations: ['moon'] }],
      ['no location', { locations: [] }],
      ['an unknown high-load area', { highLoadAreas: ['elbows'] }],
      ['an unknown slot', { slots: ['siesta'] }],
      ['no slot', { slots: [] }],
      ['three slots', { slots: ['warm-up', 'main-strength', 'cool-down'] }],
      ['an unknown movement pattern', { movementPattern: 'dance' }],
      ['an unknown source', { source: 'elsewhere' }],
      ['an unknown licence', { licence: 'MIT' }],
      ['no instructions', { instructionsEn: [] }],
      ['an easier link to itself', { easierId: 'constraint-probe' }],
      ['a harder link to itself', { harderId: 'constraint-probe' }],
      [
        'an image that is not on wger media',
        { image: { ...WGER_IMAGE, url: 'https://example.org/media/x.png' } },
      ],
      ['an image without a url', { image: { author: 'Someone' } }],
    ])('rejects %s', async (_name, values) => {
      await expect(insert(values)).rejects.toMatchObject({ cause: { code: PG_CHECK_VIOLATION } });
    });

    it('rejects a link to a row that does not exist', async () => {
      await expect(insert({ easierId: 'no-such-exercise' })).rejects.toMatchObject({
        cause: { code: PG_FOREIGN_KEY_VIOLATION },
      });
    });
  });
});

describe('migrate with an existing database', () => {
  let scratch: ScratchDatabase;
  let handle: DbHandle;
  let library: Exercise[];

  beforeAll(async () => {
    library = await loadExerciseLibrary(FIXTURE_LIBRARY_DIR);
    scratch = await createScratchDatabase(FIXTURE_LIBRARY_DIR);
    handle = createPgDb(scratch.url);
  });
  afterAll(async () => {
    await handle.close();
    await scratch.drop();
  });

  const ids = async () =>
    (
      await handle.db
        .select({ id: exercise.id })
        .from(exercise)
        .orderBy(sql`${exercise.id} collate "C"`)
    ).map((row) => row.id);

  it('syncs the library again from the current data files', async () => {
    const copy = await copyFixtureLibrary();
    try {
      const plank = library.find((e) => e.id === 'plank')!;
      await copy.write(
        'strength.json',
        library.filter((e) => e.id !== 'plank' && e.movementPattern !== 'mobility'),
      );
      await copy.write('mobility.json', []);
      await copy.write('added.json', [
        { ...plank, id: 'side-plank', name: { en: 'Side Plank', el: null } },
      ]);

      await runMigrations(scratch.url, { exerciseDataDir: copy.dir });
      const after = await ids();
      expect(after).toContain('side-plank');
      expect(after).not.toContain('plank');
      expect(after).not.toContain('worlds-greatest-stretch');

      // Back to the full library: the migrations are already applied, only the sync runs.
      await runMigrations(scratch.url, { exerciseDataDir: FIXTURE_LIBRARY_DIR });
      expect(await ids()).toEqual(library.map((e) => e.id).sort());
    } finally {
      await copy.remove();
    }
  });

  it('fails before touching the database when a data file is invalid', async () => {
    // An EMPTY database: created, never migrated. If the library were read after the migrations,
    // the tables would exist by the time the broken file is found.
    const empty = await createEmptyDatabase();
    const copy = await copyFixtureLibrary();
    try {
      await copy.write('broken.json', '[{');
      await expect(runMigrations(empty.url, { exerciseDataDir: copy.dir })).rejects.toBeInstanceOf(
        ExerciseLibraryError,
      );

      const client = new pg.Client({ connectionString: empty.url });
      await client.connect();
      try {
        const { rows } = await client.query<{ exercise: string | null; migrations: string | null }>(
          `select to_regclass('public.exercise') as exercise,
                  to_regclass('drizzle.__drizzle_migrations') as migrations`,
        );
        expect(rows).toEqual([{ exercise: null, migrations: null }]);
      } finally {
        await client.end();
      }
    } finally {
      await copy.remove();
      await empty.drop();
    }
  });
});
