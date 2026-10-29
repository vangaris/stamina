#!/usr/bin/env node
// Deploys the bundled API (apps/api/dist/server.js) to Deno Deploy as a preview revision with its
// own DATABASE_URL / CORS_ORIGINS (revision env vars are immutable and override app-level ones),
// waits for the build, checks /health, and writes `url=` to $GITHUB_OUTPUT.
//
// Env: DENO_DEPLOY_TOKEN, DENO_APP, DATABASE_URL, CORS_ORIGINS, PR_NUMBER, GIT_SHA
// API reference: https://api.deno.com/v2/docs
import { appendFileSync, readFileSync } from 'node:fs';

const api = 'https://api.deno.com/v2';
const need = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const token = need('DENO_DEPLOY_TOKEN');
const app = need('DENO_APP');
const databaseUrl = need('DATABASE_URL');
const corsOrigins = need('CORS_ORIGINS');

const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

async function call(method, path, body) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok)
    throw new Error(`${method} ${path} -> ${response.status} ${await response.text()}`);
  return response.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const server = readFileSync(new URL('../apps/api/dist/server.js', import.meta.url), 'utf-8');

let revision = await call('POST', `/apps/${app}/deploy`, {
  assets: { 'server.js': { kind: 'file', encoding: 'utf-8', content: server } },
  config: { runtime: { type: 'dynamic', entrypoint: 'server.js' } },
  env_vars: [
    { key: 'DATABASE_URL', value: databaseUrl },
    { key: 'CORS_ORIGINS', value: corsOrigins },
  ],
  labels: { 'custom.pr': process.env.PR_NUMBER ?? '', 'custom.sha': process.env.GIT_SHA ?? '' },
  production: false,
  preview: true,
});
console.log(`revision ${revision.id} created`);

const deadline = Date.now() + 5 * 60_000;
while (!['succeeded', 'failed', 'skipped'].includes(revision.status)) {
  if (Date.now() > deadline)
    throw new Error(`revision ${revision.id} still ${revision.status} after 5 minutes`);
  await sleep(3000);
  revision = await call('GET', `/revisions/${revision.id}`);
}
if (revision.status !== 'succeeded') {
  throw new Error(`revision ${revision.id} ${revision.status}: ${revision.failure_reason ?? ''}`);
}

const hostname = revision.timelines?.flatMap((t) => t.hostnames)[0];
if (!hostname) throw new Error(`revision ${revision.id} has no preview hostname`);
const url = `https://${hostname}`;

// A fresh revision may take a few seconds to route; /health proves the Neon wiring end to end.
let last = '';
for (let attempt = 0; attempt < 12; attempt++) {
  try {
    const response = await fetch(`${url}/health`);
    last = `${response.status} ${await response.text()}`;
    if (response.status === 200) break;
  } catch (error) {
    last = String(error);
  }
  if (attempt === 11) throw new Error(`${url}/health never became healthy; last: ${last}`);
  await sleep(5000);
}

console.log(`preview API ready at ${url}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `url=${url}\n`);
