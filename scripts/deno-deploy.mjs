#!/usr/bin/env node
// Deno Deploy operations for the API (apps/api/dist/server.js). API reference: https://api.deno.com/v2/docs
//
//   node scripts/deno-deploy.mjs preview    [--dry-run]   preview revision for a PR
//   node scripts/deno-deploy.mjs production [--dry-run]   production revision, promoted and pinned
//   node scripts/deno-deploy.mjs revisions                list the production revisions, newest first
//   node scripts/deno-deploy.mjs promote <revision-id> [--dry-run]   roll back (or forward) to a revision
//
// `preview` and `production` upload the bundle with its own DATABASE_URL / CORS_ORIGINS (revision env
// vars are immutable and override app-level ones), wait for the build, check /health and write `url=`
// and `revision=` to $GITHUB_OUTPUT. `production` also promotes (pins) the new revision, so a release
// after a rollback is served again instead of the pinned older revision.
//
// Env (all modes): DENO_DEPLOY_TOKEN, DENO_APP
// Env (preview, production): DATABASE_URL, CORS_ORIGINS, GIT_SHA (optional),
//   SENTRY_DSN (optional: Sentry stays off when unset), PR_NUMBER (preview), RELEASE_TAG (production)
//
// --dry-run prints the request shape with environment variable VALUES redacted and sends nothing.
import { appendFileSync, readFileSync } from 'node:fs';

const api = 'https://api.deno.com/v2';
const [mode, ...args] = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const positional = args.filter((arg) => !arg.startsWith('--'));

const commands = { preview: deploy, production: deploy, revisions, promote };
if (!commands[mode]) {
  console.error(
    'usage: deno-deploy.mjs <preview|production|revisions|promote <revision-id>> [--dry-run]',
  );
  process.exit(2);
}

const need = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const optional = (name) => process.env[name] || undefined;

const token = need('DENO_DEPLOY_TOKEN');
const app = need('DENO_APP');
const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };

async function call(method, path, body) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok)
    throw new Error(`${method} ${path} -> ${response.status} ${await response.text()}`);
  return response.status === 204 ? undefined : response.json();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Request shape for the log: env var values and asset contents never leave the process.
const redact = (body) => ({
  ...body,
  assets: Object.fromEntries(
    Object.entries(body.assets).map(([path, asset]) => [
      path,
      { kind: asset.kind, encoding: asset.encoding, content: `<${asset.content.length} chars>` },
    ]),
  ),
  env_vars: body.env_vars.map(({ key }) => ({ key, value: '<redacted>' })),
});

function deployBody() {
  const production = mode === 'production';
  const server = readFileSync(new URL('../apps/api/dist/server.js', import.meta.url), 'utf-8');
  const sentryDsn = optional('SENTRY_DSN');
  const envVars = [
    { key: 'DATABASE_URL', value: need('DATABASE_URL') },
    { key: 'CORS_ORIGINS', value: need('CORS_ORIGINS') },
    ...(sentryDsn
      ? [
          { key: 'SENTRY_DSN', value: sentryDsn },
          { key: 'SENTRY_ENVIRONMENT', value: production ? 'production' : 'preview' },
        ]
      : []),
  ];
  return {
    assets: { 'server.js': { kind: 'file', encoding: 'utf-8', content: server } },
    config: { runtime: { type: 'dynamic', entrypoint: 'server.js' } },
    env_vars: envVars,
    labels: production
      ? {
          'custom.target': 'production',
          'custom.tag': optional('RELEASE_TAG') ?? '',
          'custom.sha': optional('GIT_SHA') ?? '',
        }
      : { 'custom.pr': optional('PR_NUMBER') ?? '', 'custom.sha': optional('GIT_SHA') ?? '' },
    production,
    preview: !production,
  };
}

async function waitForBuild(revision) {
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
  return revision;
}

// Hostname that serves this revision: the Production timeline's for production, else any.
function hostnameOf(revision, production) {
  const timelines = revision.timelines ?? [];
  const wanted = production
    ? timelines.filter((timeline) => /production/i.test(timeline.name))
    : timelines;
  return wanted.flatMap((timeline) => timeline.hostnames)[0];
}

// Right after a promote the Production timeline can take a while to list its hostname.
async function waitForHostname(revision, production) {
  for (let attempt = 0; attempt < 24; attempt++) {
    const hostname = hostnameOf(revision, production);
    if (hostname) return hostname;
    await sleep(5000);
    revision = await call('GET', `/revisions/${revision.id}`);
  }
  return undefined;
}

// A fresh revision may take a few seconds to route; /health proves the Neon wiring end to end.
async function waitForHealth(url) {
  let last = '';
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const response = await fetch(`${url}/health`);
      last = `${response.status} ${await response.text()}`;
      if (response.status === 200) return;
    } catch (error) {
      last = String(error);
    }
    await sleep(5000);
  }
  throw new Error(`${url}/health never became healthy; last: ${last}`);
}

function output(values) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(values)
      .map(([key, value]) => `${key}=${value}\n`)
      .join(''),
  );
}

async function deploy() {
  const production = mode === 'production';
  const body = deployBody();

  if (dryRun) {
    console.log(`dry run: nothing is sent. Steps for a ${mode} deploy of app "${app}":`);
    console.log(`1. POST ${api}/apps/${app}/deploy`);
    console.log(JSON.stringify(redact(body), null, 2));
    console.log('2. poll GET /revisions/<id> until status is succeeded (5 minute limit)');
    if (production) console.log('3. POST /revisions/<id>/promote (pins production to it)');
    console.log(`${production ? '4' : '3'}. GET <hostname>/health until 200 (12 attempts)`);
    return;
  }

  let revision = await call('POST', `/apps/${app}/deploy`, body);
  console.log(`revision ${revision.id} created`);
  revision = await waitForBuild(revision);

  if (production) {
    await call('POST', `/revisions/${revision.id}/promote`);
    console.log(`revision ${revision.id} promoted to production`);
    revision = await call('GET', `/revisions/${revision.id}`);
  }

  const hostname = await waitForHostname(revision, production);
  if (!hostname) throw new Error(`revision ${revision.id} has no ${mode} hostname`);
  const url = `https://${hostname}`;
  await waitForHealth(url);

  console.log(`${mode} API ready at ${url} (revision ${revision.id})`);
  output({ url, revision: revision.id });
}

async function revisions() {
  const list = await call('GET', `/apps/${app}/revisions?status=succeeded&limit=100`);
  for (const revision of list) {
    if (revision.labels?.['custom.target'] !== 'production') continue;
    const { 'custom.tag': tag = '', 'custom.sha': sha = '' } = revision.labels;
    console.log(`${revision.id}  ${revision.created_at}  ${tag || '-'}  ${sha.slice(0, 7) || '-'}`);
  }
}

async function promote() {
  const [id] = positional;
  if (!id) throw new Error('usage: promote <revision-id>');
  if (dryRun) {
    console.log(`dry run: nothing is sent. Would POST ${api}/revisions/${id}/promote`);
    return;
  }
  await call('POST', `/revisions/${id}/promote`);
  const revision = await call('GET', `/revisions/${id}`);
  const hostname = await waitForHostname(revision, true);
  console.log(`revision ${id} promoted to production`);
  if (hostname) await waitForHealth(`https://${hostname}`);
  console.log(
    hostname ? `healthy at https://${hostname}` : 'promoted; no production hostname listed',
  );
}

await commands[mode]();
