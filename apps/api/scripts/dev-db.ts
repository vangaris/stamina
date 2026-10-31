import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import { runMigrations } from '../src/db/migrate.ts';

/**
 * Local Postgres for development and the Playwright run: real Postgres, no Docker.
 * Data lives in apps/api/.pgdata, or `DEV_DB_DIR` (gitignored). Stop with Ctrl-C.
 */
const port = Number(process.env.DEV_DB_PORT ?? 54329);
// A separate folder per database, so the Playwright run never fights a dev database that is already up.
const dir = join(
  fileURLToPath(new URL('..', import.meta.url)),
  process.env.DEV_DB_DIR ?? '.pgdata',
);

const exists = await stat(join(dir, 'PG_VERSION')).then(
  () => true,
  () => false,
);
await mkdir(dir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: 'stamina',
  password: 'stamina',
  port,
  persistent: true,
  onLog: () => {},
  onError: () => {},
});
if (!exists) await pg.initialise();
await pg.start();
if (!exists) await pg.createDatabase('stamina');

const url = `postgres://stamina:stamina@127.0.0.1:${port}/stamina`;
await runMigrations(url);
console.log(`dev database ready: ${url}`);

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
