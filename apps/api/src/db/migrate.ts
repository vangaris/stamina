import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { EXERCISE_DATA_DIR, loadExerciseLibrary, syncExerciseLibrary } from '../exercises/node.ts';
import { SPORT_DATA_DIR, loadLaunchSports, syncLaunchSports } from '../sports/node.ts';
import * as schema from './schema.ts';

export const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

export interface RunMigrationsOptions {
  /** Where the exercise library is read from; the real data by default. */
  exerciseDataDir?: string;
  /** Where the launch sports are read from; the real data by default. */
  sportDataDir?: string;
}

/**
 * Forward-only: applies every migration not yet recorded, never rolls back. Then syncs the
 * exercise library and the launch sports from their data files, so the dev database, the test database, previews and
 * production all carry the same library (the exercise sync is idempotent; the sport sync only inserts the sports that are missing, so
 * the founder's edits to a sport survive).
 */
export async function runMigrations(
  connectionString: string,
  { exerciseDataDir = EXERCISE_DATA_DIR, sportDataDir = SPORT_DATA_DIR }: RunMigrationsOptions = {},
): Promise<void> {
  // Read first: a broken data file fails before the database is touched.
  const library = await loadExerciseLibrary(exerciseDataDir);
  const sports = await loadLaunchSports(sportDataDir);
  const pool = new pg.Pool({ connectionString });
  try {
    const db = drizzle(pool, { schema });
    await migrate(db, { migrationsFolder });
    await syncExerciseLibrary(db, library);
    for (const id of await syncLaunchSports(db, sports)) {
      console.log(
        `sport ${id}: stored profile differs from its data file (the file is not applied)`,
      );
    }
  } finally {
    await pool.end();
  }
}
