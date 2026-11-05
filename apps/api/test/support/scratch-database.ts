import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { inject } from 'vitest';
import { runMigrations } from '../../src/db/migrate.ts';
import { FIXTURE_SPORT_DIR } from './sport-data-dir.ts';

/** A throwaway database on the test server. */
export interface ScratchDatabase {
  url: string;
  drop(): Promise<void>;
}

/** A database of its own on the test server, created but not migrated: no tables, nothing. */
export async function createEmptyDatabase(): Promise<ScratchDatabase> {
  const shared = new URL(inject('databaseUrl'));
  const name = `scratch_${randomBytes(6).toString('hex')}`;
  const own = new URL(shared);
  own.pathname = `/${name}`;

  const admin = new pg.Client({ connectionString: shared.toString() });
  await admin.connect();
  try {
    await admin.query(`create database ${name}`);
  } finally {
    await admin.end();
  }

  return {
    url: own.toString(),
    async drop() {
      const dropper = new pg.Client({ connectionString: shared.toString() });
      await dropper.connect();
      try {
        await dropper.query(`drop database ${name} with (force)`);
      } finally {
        await dropper.end();
      }
    },
  };
}

/**
 * A database of its own on the test server, migrated and synced from `exerciseDataDir` and
 * `sportDataDir`, so a test can rewrite the exercise library or the launch sports without touching
 * what other test files read. Needs a role that
 * may create databases (the embedded server's user and a CI service container's superuser both do).
 */
export async function createScratchDatabase(
  exerciseDataDir: string,
  sportDataDir: string = FIXTURE_SPORT_DIR,
): Promise<ScratchDatabase> {
  const database = await createEmptyDatabase();
  await runMigrations(database.url, { exerciseDataDir, sportDataDir });
  return database;
}
