import type { LaunchSportData } from '@stamina/contracts';
import { LaunchSport, SportStatus } from '@stamina/domain';
import { eq } from 'drizzle-orm';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { runMigrations } from '../src/db/migrate.ts';
import { createPgDb } from '../src/db/pg-client.ts';
import { appUser, sport, sportRequest } from '../src/db/schema.ts';
import { withUser } from '../src/db/with-user.ts';
import { requestSport } from '../src/sports/index.ts';
import type { DbHandle } from '../src/db/types.ts';
import { loadLaunchSports, SportDataError, syncLaunchSports } from '../src/sports/node.ts';
import { FIXTURE_LIBRARY_DIR } from './support/exercise-library-dir.ts';
import {
  createEmptyDatabase,
  createScratchDatabase,
  type ScratchDatabase,
} from './support/scratch-database.ts';
import {
  copyFixtureSports,
  FIXTURE_SPORT_DIR,
  type FixtureSportsCopy,
} from './support/sport-data-dir.ts';

describe('launch sport loader', () => {
  let sports: LaunchSportData[];
  beforeAll(async () => {
    sports = await loadLaunchSports(FIXTURE_SPORT_DIR);
  });

  const withCopy = async (run: (copy: FixtureSportsCopy) => Promise<void>) => {
    const copy = await copyFixtureSports();
    try {
      await run(copy);
    } finally {
      await copy.remove();
    }
  };
  const loadError = async (dir: string) => {
    const error = await loadLaunchSports(dir).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(SportDataError);
    return (error as Error).message;
  };
  const padel = () => sports.find((s) => s.id === LaunchSport.Padel)!;

  it('reads one file per launch sport, ignoring other files', async () => {
    expect(sports.map((s) => s.id).sort()).toEqual(Object.values(LaunchSport).sort());
    await withCopy(async (copy) => {
      await copy.write('notes.txt', 'not json');
      expect(await loadLaunchSports(copy.dir)).toEqual(sports);
    });
  });

  it('rejects a missing launch sport, naming it', async () => {
    await withCopy(async (copy) => {
      await rm(copy, 'hyrox.json');
      expect(await loadError(copy.dir)).toContain('no data file for launch sport "hyrox"');
    });
  });

  it('rejects a sport that appears in two files, naming both', async () => {
    await withCopy(async (copy) => {
      await copy.write('zzz-padel-again.json', padel());
      const message = await loadError(copy.dir);
      expect(message).toContain('zzz-padel-again.json: duplicate sport "padel"');
      expect(message).toContain('padel.json');
    });
  });

  it('rejects an id that is not a launch sport', async () => {
    await withCopy(async (copy) => {
      await copy.write('curling.json', { ...padel(), id: 'curling' });
      expect(await loadError(copy.dir)).toContain('curling.json: id');
    });
  });

  it('rejects an invalid field, naming the file and the field', async () => {
    await withCopy(async (copy) => {
      await copy.write('padel.json', {
        ...padel(),
        profile: {
          ...padel().profile,
          energyMix: { aerobic: 50, repeatedSprint: 50, explosive: 50 },
        },
        sources: [{ title: 'One source over http', url: 'http://example.org/x' }],
      });
      const message = await loadError(copy.dir);
      expect(message).toContain('padel.json: profile.energyMix');
      expect(message).toContain('padel.json: sources');
    });
  });

  it('rejects a file that is not JSON, and reports every problem at once', async () => {
    await withCopy(async (copy) => {
      await copy.write('padel.json', '{');
      await rm(copy, 'tennis.json');
      const message = await loadError(copy.dir);
      expect(message).toContain('padel.json: not readable JSON');
      expect(message).toContain('no data file for launch sport "tennis"');
    });
  });

  it('rejects a data directory that does not exist', async () => {
    await expect(loadLaunchSports('/nonexistent/stamina-sports')).rejects.toThrow();
  });
});

async function rm(copy: FixtureSportsCopy, file: string) {
  const { rm: remove } = await import('node:fs/promises');
  await remove(`${copy.dir}/${file}`);
}

describe('launch sport sync', () => {
  let scratch: ScratchDatabase;
  let handle: DbHandle;
  let sports: LaunchSportData[];

  beforeAll(async () => {
    sports = await loadLaunchSports(FIXTURE_SPORT_DIR);
    scratch = await createScratchDatabase(FIXTURE_LIBRARY_DIR);
    handle = createPgDb(scratch.url);
  });
  afterAll(async () => {
    await handle.close();
    await scratch.drop();
  });

  const row = async (id: string) =>
    (await handle.db.select().from(sport).where(eq(sport.id, id)))[0]!;

  it('has seeded every launch sport as a draft with its normalized name, profile and sources', async () => {
    for (const data of sports) {
      expect(await row(data.id)).toMatchObject({
        name: data.name,
        status: SportStatus.Draft,
        profile: data.profile,
        sources: data.sources,
        version: 1,
        approvedBy: null,
        approvedAt: null,
      });
    }
    expect((await row('beach-volleyball')).normalizedName).toBe('beach volleyball');
  });

  it('is insert-if-missing: an edited row survives a second sync and a second migrate', async () => {
    const approvedAt = new Date('2026-11-01T10:00:00Z');
    await handle.db
      .update(sport)
      .set({
        status: SportStatus.Approved,
        approvedBy: 'Vang',
        approvedAt,
        version: 2,
        name: 'Padel (edited)',
        profile: { ...sports[0]!.profile, recoveryWindowHours: { lower: 48, upper: 36 } },
      })
      .where(eq(sport.id, LaunchSport.Padel));

    await syncLaunchSports(handle.db, sports);
    await runMigrations(scratch.url, {
      exerciseDataDir: FIXTURE_LIBRARY_DIR,
      sportDataDir: FIXTURE_SPORT_DIR,
    });

    expect(await row(LaunchSport.Padel)).toMatchObject({
      status: SportStatus.Approved,
      approvedBy: 'Vang',
      approvedAt,
      version: 2,
      name: 'Padel (edited)',
      profile: { recoveryWindowHours: { lower: 48, upper: 36 } },
    });
  });

  it('adds a sport that is missing, and only that one', async () => {
    await handle.db.delete(sport).where(eq(sport.id, LaunchSport.Hyrox));
    await runMigrations(scratch.url, {
      exerciseDataDir: FIXTURE_LIBRARY_DIR,
      sportDataDir: FIXTURE_SPORT_DIR,
    });
    expect(await row(LaunchSport.Hyrox)).toMatchObject({ status: SportStatus.Draft });
    expect((await row(LaunchSport.Padel)).name).toBe('Padel (edited)');
  });

  it('seeds a launch sport over a stray row with the same name and does not show the unreviewed draft to the people who asked', async () => {
    const hyrox = sports.find((s) => s.id === LaunchSport.Hyrox)!;
    const [first, second] = [crypto.randomUUID(), crypto.randomUUID()];
    await handle.db.insert(appUser).values([{ id: first }, { id: second }]);
    // The launch row is gone (deleted to re-seed it), and two people ask for its name meanwhile.
    await handle.db.delete(sport).where(eq(sport.id, LaunchSport.Hyrox));
    const strayId = await withUser(handle.db, first, (tx) => requestSport(tx, hyrox.name));
    await withUser(handle.db, second, (tx) => requestSport(tx, hyrox.name.toUpperCase()));
    expect(strayId).not.toBe(LaunchSport.Hyrox);

    await runMigrations(scratch.url, {
      exerciseDataDir: FIXTURE_LIBRARY_DIR,
      sportDataDir: FIXTURE_SPORT_DIR,
    });

    expect(await row(LaunchSport.Hyrox)).toMatchObject({
      status: SportStatus.Draft,
      name: hyrox.name,
      profile: hyrox.profile,
    });
    expect((await handle.db.select().from(sport).where(eq(sport.id, strayId!))).length).toBe(0);
    const requests = await handle.db
      .select({ userId: sportRequest.userId })
      .from(sportRequest)
      .where(eq(sportRequest.sportId, LaunchSport.Hyrox));
    expect(requests).toEqual([]);
    for (const user of [first, second]) {
      const visible = await withUser(handle.db, user, (tx) =>
        tx.select({ id: sport.id }).from(sport).where(eq(sport.id, LaunchSport.Hyrox)),
      );
      expect(visible).toEqual([]);
    }
  });

  it('seeds a launch sport added later whose name somebody already requested', async () => {
    const tennis = sports.find((s) => s.id === LaunchSport.Tennis)!;
    const asker = crypto.randomUUID();
    await handle.db.insert(appUser).values({ id: asker });
    await handle.db.delete(sport).where(eq(sport.id, LaunchSport.Tennis));
    await withUser(handle.db, asker, (tx) => requestSport(tx, tennis.name));

    expect(await syncLaunchSports(handle.db, sports)).not.toContain(LaunchSport.Tennis);

    expect((await row(LaunchSport.Tennis)).name).toBe(tennis.name);
    expect(
      await handle.db
        .select()
        .from(sportRequest)
        .where(eq(sportRequest.sportId, LaunchSport.Tennis)),
    ).toEqual([]);
    // A second sync changes nothing and does not fail.
    expect(await syncLaunchSports(handle.db, sports)).not.toContain(LaunchSport.Tennis);
  });

  it('reports, by id only, the launch sports whose stored profile differs from the file', async () => {
    const original = (await row(LaunchSport.Running)).profile!;
    await handle.db
      .update(sport)
      .set({ profile: { ...original, recoveryWindowHours: { lower: 90, upper: 90 } } })
      .where(eq(sport.id, LaunchSport.Running));
    const logged: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(' '));
    });
    try {
      expect(await syncLaunchSports(handle.db, sports)).toContain(LaunchSport.Running);
      await runMigrations(scratch.url, {
        exerciseDataDir: FIXTURE_LIBRARY_DIR,
        sportDataDir: FIXTURE_SPORT_DIR,
      });
    } finally {
      spy.mockRestore();
      await handle.db
        .update(sport)
        .set({ profile: original })
        .where(eq(sport.id, LaunchSport.Running));
    }
    expect(logged.join('\n')).toContain(`sport ${LaunchSport.Running}:`);
    expect(logged.join('\n')).not.toContain('recoveryWindowHours');
  });

  it('fails before touching the database when a sport file is invalid', async () => {
    const empty = await createEmptyDatabase();
    const copy = await copyFixtureSports();
    try {
      await copy.write('padel.json', '[{');
      await expect(
        runMigrations(empty.url, {
          exerciseDataDir: FIXTURE_LIBRARY_DIR,
          sportDataDir: copy.dir,
        }),
      ).rejects.toBeInstanceOf(SportDataError);

      const client = new pg.Client({ connectionString: empty.url });
      await client.connect();
      try {
        const { rows } = await client.query<{ sport: string | null; migrations: string | null }>(
          `select to_regclass('public.sport') as sport,
                  to_regclass('drizzle.__drizzle_migrations') as migrations`,
        );
        expect(rows).toEqual([{ sport: null, migrations: null }]);
      } finally {
        await client.end();
      }
    } finally {
      await copy.remove();
      await empty.drop();
    }
  });
});
