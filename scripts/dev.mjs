#!/usr/bin/env node
// Local stack in one terminal: `pnpm dev`.
//
// Starts the embedded Postgres (apps/api `db:dev`), waits until it is migrated and ready, then starts the
// API (:8787) and the web app (:5173). Output is prefixed per process. Ctrl-C stops all three; if any process
// exits on its own, the rest are stopped and this script exits with that code.
// Creates apps/api/.env from .env.example when it is missing, and refuses to start when a port is taken.
import { spawn } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const env = new URL('../apps/api/.env', import.meta.url);
const PORTS = { database: 54329, api: 8787, web: 5173 };
const PORT_PROBE_MS = 500;
const READY = 'dev database ready';
const STOP_GRACE_MS = 5000;

// True when something already accepts connections on the port (IPv4 or IPv6 loopback: Vite binds ::1).
const isListening = (port) =>
  Promise.all(
    ['127.0.0.1', '::1'].map(
      (host) =>
        new Promise((resolve) => {
          const socket = connect({ port, host, timeout: PORT_PROBE_MS });
          socket.once('connect', () => resolve(true));
          socket.once('timeout', () => resolve(false));
          socket.once('error', () => resolve(false));
          socket.once('close', () => socket.destroy());
        }),
    ),
  ).then((results) => results.some(Boolean));

const busy = [];
for (const [name, port] of Object.entries(PORTS)) {
  if (await isListening(port)) busy.push(`${name} :${port}`);
}
if (busy.length > 0) {
  console.error(
    `[dev] already in use: ${busy.join(', ')}. Stop what is running there ` +
      '(lsof -nP -iTCP:<port> -sTCP:LISTEN), then retry.',
  );
  process.exit(1);
}

if (!existsSync(env)) {
  copyFileSync(new URL('../apps/api/.env.example', import.meta.url), env);
  console.log('[dev] created apps/api/.env from .env.example');
}

const children = [];
let stopping = false;
let exitCode = 0;

function start(name, filter, script, onLine = () => {}) {
  const child = spawn('pnpm', ['--filter', filter, '--silent', script], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  let pending = '';
  const pipe = (stream, out) =>
    stream.on('data', (chunk) => {
      const lines = (pending + chunk).split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) {
        out.write(`[${name}] ${line}\n`);
        onLine(line);
      }
    });
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`[dev] ${name} exited (${signal ?? code}); stopping the rest`);
      exitCode = code ?? 1;
      stop();
    }
  });
  return child;
}

function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  const force = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
  }, STOP_GRACE_MS);
  force.unref();
  let alive = children.length;
  for (const child of children) {
    const done = () => {
      alive -= 1;
      if (alive === 0) process.exit(exitCode);
    };
    if (child.exitCode !== null || child.signalCode !== null) done();
    else child.once('exit', done);
  }
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

let appsStarted = false;
start('db ', '@stamina/api', 'db:dev', (line) => {
  if (appsStarted || stopping || !line.includes(READY)) return;
  appsStarted = true;
  start('api', '@stamina/api', 'dev');
  start('web', '@stamina/web', 'dev');
  console.log('[dev] api http://127.0.0.1:8787   web http://localhost:5173');
});
