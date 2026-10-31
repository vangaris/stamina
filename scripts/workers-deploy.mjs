#!/usr/bin/env node
// Cloudflare Workers operations for the API (apps/api/src/worker.ts, config in apps/api/wrangler.jsonc).
// Wrangler reference: https://developers.cloudflare.com/workers/wrangler/commands/workers/
//
//   node scripts/workers-deploy.mjs preview    [--dry-run]   deploy stamina-api-pr-<PR_NUMBER>
//   node scripts/workers-deploy.mjs production [--dry-run]   deploy stamina-api
//   node scripts/workers-deploy.mjs delete     [--dry-run]   delete stamina-api-pr-<PR_NUMBER> (a missing Worker is fine)
//   node scripts/workers-deploy.mjs rollback [<version-id>] [--dry-run]   roll stamina-api back (default: the previous version)
//
// `preview` and `production` run `wrangler deploy --name <name>` with the plain vars (CORS_ORIGINS,
// NEON_AUTH_BASE_URL, SENTRY_ENVIRONMENT) as `--var`, then `wrangler secret bulk` with the secrets
// (DATABASE_URL, SENTRY_DSN when set) from a 0600 temp file that is deleted afterwards: secret values are
// never on a command line, never printed. They then resolve the public URL, wait for `<url>/health` to
// answer 200 and write `url=` and `version=` to $GITHUB_OUTPUT.
//
// The public URL is https://<name>.<account workers.dev subdomain>.workers.dev. The subdomain comes from
// the Cloudflare API (GET /accounts/{CLOUDFLARE_ACCOUNT_ID}/workers/subdomain), with the *.workers.dev URL
// in wrangler's output as a fallback.
//
// Env (all modes): CLOUDFLARE_API_TOKEN (needs Account > Workers Scripts > Edit), CLOUDFLARE_ACCOUNT_ID
// Env (preview, production): DATABASE_URL (pooled), CORS_ORIGINS, NEON_AUTH_BASE_URL (the branch's Neon Auth
//   URL the API verifies tokens against), SENTRY_DSN (optional: Sentry stays off when unset),
//   GIT_SHA and RELEASE_TAG (optional, only recorded in the deployment message)
// Env (preview, delete): PR_NUMBER
// Test seams: CLOUDFLARE_API_BASE (default https://api.cloudflare.com/client/v4), HEALTH_CHECK_ORIGIN (fetch
//   /health from this origin instead of the public URL), HEALTH_RETRY_MS (pause between /health attempts, default 5000).
//
// --dry-run prints the plan with secret and var VALUES redacted and sends nothing.
//
// [INFERENCE] Not confirmed against a live account (the token available while writing this could not write
// Workers), taken from the Wrangler docs or from memory of Wrangler's behaviour:
//   - `wrangler delete --force` (the docs list --name and --dry-run only; --force skips the confirmation prompt).
//   - `wrangler deploy --var KEY:VALUE` splits on the first colon, so URLs as values work.
//   - `wrangler secret bulk <file> --name <name>` works on a Worker that `deploy` has just created, and a
//     later `deploy` keeps secrets (the docs say secrets are never deleted by a deployment).
//   - `wrangler rollback --name stamina-api --message ...` runs non-interactively with --message set.
//   - wrangler's output contains "Current Version ID: <uuid>" after a deploy, and a missing Worker's delete
//     failure mentions "not found" / "does not exist" / code 10007.
//   - `pnpm --filter @stamina/api exec wrangler` resolves the wrangler binary (root or apps/api devDependency).
//   - The subdomain endpoint answers {"result":{"subdomain":"<name>"}} and an error when none is registered.
import { execFile } from 'node:child_process';
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const PRODUCTION_NAME = 'stamina-api';
const PREVIEW_PREFIX = 'stamina-api-pr-';
const Mode = {
  Preview: 'preview',
  Production: 'production',
  Delete: 'delete',
  Rollback: 'rollback',
};
const SecretKey = { DatabaseUrl: 'DATABASE_URL', SentryDsn: 'SENTRY_DSN' };
const VarKey = {
  CorsOrigins: 'CORS_ORIGINS',
  NeonAuthBaseUrl: 'NEON_AUTH_BASE_URL',
  SentryEnvironment: 'SENTRY_ENVIRONMENT',
};
const REDACTED = '<redacted>';

const apiBase = process.env.CLOUDFLARE_API_BASE || 'https://api.cloudflare.com/client/v4';
const [mode, ...args] = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const positional = args.filter((arg) => !arg.startsWith('--'));

const commands = {
  [Mode.Preview]: deploy,
  [Mode.Production]: deploy,
  [Mode.Delete]: remove,
  [Mode.Rollback]: rollback,
};
if (!commands[mode]) {
  console.error(
    'usage: workers-deploy.mjs <preview|production|delete|rollback [<version-id>]> [--dry-run]',
  );
  process.exit(2);
}

const need = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const optional = (name) => process.env[name] || undefined;

const token = need('CLOUDFLARE_API_TOKEN');
const accountId = need('CLOUDFLARE_ACCOUNT_ID');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function workerName() {
  if (mode === Mode.Production || mode === Mode.Rollback) return PRODUCTION_NAME;
  const pr = need('PR_NUMBER');
  if (!/^\d+$/.test(pr)) throw new Error(`PR_NUMBER must be a number, got "${pr}"`);
  return `${PREVIEW_PREFIX}${pr}`;
}

/** Runs wrangler from apps/api. Resolves with the exit code and combined output; never rejects. */
function wrangler(wranglerArgs) {
  return new Promise((resolve) => {
    execFile(
      'pnpm',
      ['--filter', '@stamina/api', 'exec', 'wrangler', ...wranglerArgs],
      { env: process.env, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({ code: error ? (error.code ?? 1) : 0, output: stdout + stderr });
      },
    );
  });
}

const accessHint =
  'The Cloudflare API token cannot manage Workers. Create one with Account > Workers Scripts > Edit ' +
  '(plus the Pages permissions it already has) and update CLOUDFLARE_API_TOKEN: see docs/infra.md, "Runbook: Cloudflare token and Workers".';

function explain(output) {
  if (
    /No access to the specified resource|Authentication error|code: 10000|\b10000\b/i.test(output)
  )
    return accessHint;
  if (/workers\.dev subdomain|onboarding|code: 10063|\b10063\b/i.test(output))
    return 'The account has no workers.dev subdomain yet. Register one (free, no card): dashboard > Workers & Pages (docs/infra.md, "Runbook: Cloudflare token and Workers").';
  return undefined;
}

function fail(what, output) {
  const hint = explain(output);
  throw new Error(`${what} failed.\n${output.trim()}${hint ? `\n\n${hint}` : ''}`);
}

async function accountSubdomain() {
  const response = await fetch(`${apiBase}/accounts/${accountId}/workers/subdomain`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  const subdomain = body?.result?.subdomain;
  if (response.ok && subdomain) return subdomain;
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `reading the workers.dev subdomain failed: HTTP ${response.status}. ${accessHint}`,
    );
  }
  throw new Error(
    `the account has no workers.dev subdomain (GET /workers/subdomain -> HTTP ${response.status}). ` +
      'Register one, which is free and needs no card: Cloudflare dashboard > Workers & Pages (docs/infra.md, "Runbook: Cloudflare token and Workers").',
  );
}

async function publicUrl(name, wranglerOutput = '') {
  try {
    return `https://${name}.${await accountSubdomain()}.workers.dev`;
  } catch (error) {
    const fromWrangler = wranglerOutput.match(/https:\/\/[\w.-]+\.workers\.dev/i)?.[0];
    if (fromWrangler) return fromWrangler;
    throw error;
  }
}

// A fresh Worker can take a few seconds to route; /health proves the Neon wiring end to end.
async function waitForHealth(url) {
  const origin = optional('HEALTH_CHECK_ORIGIN') ?? url;
  let last = '';
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const response = await fetch(`${origin}/health`);
      last = `${response.status} ${await response.text()}`;
      if (response.status === 200) return;
    } catch (error) {
      last = String(error);
    }
    await sleep(Number(optional('HEALTH_RETRY_MS') ?? 5000));
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

function plan() {
  const production = mode === Mode.Production;
  const sentryDsn = optional(SecretKey.SentryDsn);
  const vars = [
    [VarKey.CorsOrigins, need(VarKey.CorsOrigins)],
    [VarKey.NeonAuthBaseUrl, need(VarKey.NeonAuthBaseUrl)],
    [VarKey.SentryEnvironment, production ? 'production' : 'preview'],
  ];
  const secrets = {
    [SecretKey.DatabaseUrl]: need(SecretKey.DatabaseUrl),
    ...(sentryDsn ? { [SecretKey.SentryDsn]: sentryDsn } : {}),
  };
  const sha = optional('GIT_SHA');
  const message = (
    production
      ? ['release', optional('RELEASE_TAG'), sha]
      : ['preview', 'PR', optional('PR_NUMBER'), sha]
  )
    .filter(Boolean)
    .join(' ');
  return { vars, secrets, message };
}

async function deploy() {
  const name = workerName();
  const { vars, secrets, message } = plan();
  const deployArgs = [
    'deploy',
    '--name',
    name,
    ...vars.flatMap(([key, value]) => ['--var', `${key}:${value}`]),
    '--message',
    message,
  ];

  if (dryRun) {
    const shown = [
      'deploy',
      '--name',
      name,
      ...vars.flatMap(([key]) => ['--var', `${key}:${REDACTED}`]),
      '--message',
      `"${message}"`,
    ];
    console.log(`dry run: nothing is sent. Steps for a ${mode} deploy of Worker "${name}":`);
    console.log('1. GET /accounts/<account>/workers/subdomain (public URL)');
    console.log(`2. wrangler ${shown.join(' ')}`);
    console.log(
      `3. wrangler secret bulk <temp file, deleted afterwards> --name ${name}  keys: ${Object.keys(secrets).join(', ')} (values ${REDACTED})`,
    );
    console.log('4. GET <url>/health until 200 (12 attempts)');
    return;
  }

  const url = await publicUrl(name);

  const deployed = await wrangler(deployArgs);
  console.log(deployed.output.trim());
  if (deployed.code !== 0) fail(`wrangler deploy of ${name}`, deployed.output);

  const dir = mkdtempSync(join(tmpdir(), 'workers-secrets-'));
  const file = join(dir, 'secrets.json');
  try {
    writeFileSync(file, JSON.stringify(secrets), { mode: 0o600 });
    const uploaded = await wrangler(['secret', 'bulk', file, '--name', name]);
    console.log(uploaded.output.trim());
    if (uploaded.code !== 0) fail(`wrangler secret bulk for ${name}`, uploaded.output);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  await waitForHealth(url);
  const version = deployed.output.match(/Version ID:\s*([0-9a-f-]{36})/i)?.[1] ?? '';
  console.log(`${mode} API ready at ${url}${version ? ` (version ${version})` : ''}`);
  output({ url, version });
}

async function remove() {
  const name = workerName();
  if (!name.startsWith(PREVIEW_PREFIX)) throw new Error(`refusing to delete ${name}`);
  if (dryRun) {
    console.log(`dry run: nothing is sent. Would run: wrangler delete --name ${name} --force`);
    return;
  }
  const result = await wrangler(['delete', '--name', name, '--force']);
  console.log(result.output.trim());
  if (result.code === 0) return console.log(`deleted Worker ${name}`);
  if (/not found|does not exist|could not be found|\b10007\b/i.test(result.output)) {
    return console.log(`Worker ${name} does not exist; nothing to delete`);
  }
  fail(`wrangler delete of ${name}`, result.output);
}

async function rollback() {
  const [versionId] = positional;
  const name = workerName();
  const rollbackArgs = [
    'rollback',
    ...(versionId ? [versionId] : []),
    '--name',
    name,
    '--message',
    'rollback by scripts/workers-deploy.mjs',
  ];
  if (dryRun) {
    console.log(`dry run: nothing is sent. Would run: wrangler ${rollbackArgs.join(' ')}`);
    console.log('then GET <url>/health until 200');
    return;
  }
  const url = await publicUrl(name);
  const result = await wrangler(rollbackArgs);
  console.log(result.output.trim());
  if (result.code !== 0) fail(`wrangler rollback of ${name}`, result.output);
  await waitForHealth(url);
  const version = result.output.match(/Version ID:\s*([0-9a-f-]{36})/i)?.[1] ?? versionId ?? '';
  console.log(`rolled back; healthy at ${url}`);
  output({ url, version });
}

try {
  await commands[mode]();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
