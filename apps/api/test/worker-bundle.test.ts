import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const run = promisify(execFile);
const BUNDLE_TIMEOUT_MS = 60_000;
const NEON_DRIVER = '/node_modules/@neondatabase/serverless/';
/** Any of these paths in the bundle means the Worker pulled in the TCP driver. */
const PG_DRIVER_PATHS = ['/node_modules/pg/', '/node_modules/pg-pool/', '/node-postgres/'];

/** The exercise library is synced by `migrate()`, never loaded by the Worker, so neither its files nor its Node-only code may be in the bundle. */
const LIBRARY_LOADER_PATHS = [
  '/src/exercises/data/',
  '/src/exercises/load-exercise-library',
  '/src/exercises/sync-exercise-library',
  '/src/exercises/node',
  '/src/db/migrate',
];

/** Likewise the launch sports: seeded by `migrate()`, drafted by the founder's script, never by the Worker. */
const SPORT_NODE_PATHS = [
  '/src/sports/data/',
  '/src/sports/load-launch-sports',
  '/src/sports/config',
  '/src/sports/sync-launch-sports',
  '/src/sports/draft-sport-profile',
  '/src/sports/build-sport-draft-prompt',
  '/src/sports/node',
];

describe('Worker bundle', () => {
  let sources: string[];
  let outdir: string;

  beforeAll(async () => {
    outdir = await mkdtemp(join(tmpdir(), 'stamina-worker-'));
    await run('pnpm', ['exec', 'wrangler', 'deploy', '--dry-run', '--outdir', outdir], {
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    const map = JSON.parse(await readFile(join(outdir, 'worker.js.map'), 'utf8'));
    sources = map.sources;
  }, BUNDLE_TIMEOUT_MS);
  afterAll(() => rm(outdir, { recursive: true, force: true }));

  it('contains the Neon WebSocket driver and no pg driver', () => {
    expect(sources.some((path) => path.includes(NEON_DRIVER))).toBe(true);
    for (const forbidden of PG_DRIVER_PATHS) {
      expect(sources.filter((path) => path.includes(forbidden))).toEqual([]);
    }
  });

  it('serves exercises from the database without the library data, loader or sync', () => {
    expect(sources.some((path) => path.includes('/src/routes/exercise-routes'))).toBe(true);
    for (const forbidden of LIBRARY_LOADER_PATHS) {
      expect(sources.filter((path) => path.includes(forbidden))).toEqual([]);
    }
  });

  it('serves sports from the database without the data, loader, sync or drafting', () => {
    expect(sources.some((path) => path.includes('/src/routes/sport-routes'))).toBe(true);
    for (const forbidden of SPORT_NODE_PATHS) {
      expect(sources.filter((path) => path.includes(forbidden))).toEqual([]);
    }
  });
});
