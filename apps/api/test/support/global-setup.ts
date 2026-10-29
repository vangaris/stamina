import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';
import type { TestProject } from 'vitest/node';
import { runMigrations } from '../../src/db/migrate.ts';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });
}

/**
 * Seam 1 runs against real Postgres. CI points `TEST_DATABASE_URL` at a service container;
 * locally an embedded Postgres is started in a temp dir, so no Docker or install is needed.
 */
export default async function setup(project: TestProject) {
  const external = process.env.TEST_DATABASE_URL;
  if (external) {
    await runMigrations(external);
    project.provide('databaseUrl', external);
    return;
  }

  const dir = await mkdtemp(join(tmpdir(), 'stamina-pg-'));
  const port = await freePort();
  const pg = new EmbeddedPostgres({
    databaseDir: dir,
    user: 'stamina',
    password: 'stamina',
    port,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('stamina_test');

  const url = `postgres://stamina:stamina@127.0.0.1:${port}/stamina_test`;
  await runMigrations(url);
  project.provide('databaseUrl', url);

  return async () => {
    await pg.stop();
    await rm(dir, { recursive: true, force: true });
  };
}
