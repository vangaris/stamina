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
});
