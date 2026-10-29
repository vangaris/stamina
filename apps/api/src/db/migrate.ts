import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

export const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

/** Forward-only: applies every migration not yet recorded, never rolls back. */
export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new pg.Pool({ connectionString });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}
