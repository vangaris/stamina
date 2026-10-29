// Throwaway embedded Postgres for smoke.sh: temp data dir, creates the `stamina` (source) and
// `scratch` (empty restore target) databases, then waits for SIGTERM/SIGINT.
// Usage: node pg-fixture.mjs <port> <datadir> <readyfile>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [port, dir, ready] = process.argv.slice(2);
// embedded-postgres is a devDependency of apps/api, not of the repo root.
const require = createRequire(
  fileURLToPath(new URL('../../../apps/api/package.json', import.meta.url)),
);
const { default: EmbeddedPostgres } = await import(
  pathToFileURL(require.resolve('embedded-postgres')).href
);

const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: 'stamina',
  password: 'stamina',
  port: Number(port),
  persistent: false,
  onLog: () => {},
  onError: () => {},
});
await pg.initialise();
await pg.start();
await pg.createDatabase('stamina');
await pg.createDatabase('scratch');
writeFileSync(ready, 'ready\n');

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
