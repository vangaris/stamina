#!/usr/bin/env node
// Configures Neon Auth (managed Better Auth) on one Neon branch for Stamina's sign-in (ticket 04):
// enables it, allows the web origins, turns on email sign-in (the Email OTP plugin needs nothing more),
// points sign-in emails at Brevo's SMTP relay and registers Stamina's own Google OAuth client.
// Idempotent: every step reads the current state first or is a PATCH that sets the same values again.
//
//   node scripts/ops/neon-auth-setup.mjs [--branch <id|name>] [--web-origin <https://origin>]... [--dry-run]
//   node scripts/ops/neon-auth-setup.mjs --preview --branch <br-id> --web-origin <https://origin>
//
// Env (also read from ./.env, or the file named by ENV_FILE; real environment variables win):
//   NEON_API_KEY, NEON_PROJECT_ID   as for the other Neon scripts (never printed)
//   BREVO_SMTP_LOGIN                Brevo > SMTP & API > SMTP > Login (not the API key)
//   BREVO_SMTP_KEY                  Brevo > SMTP & API > SMTP > "Generate a new SMTP key" (never printed)
//   SENDER_EMAIL                    the From address, the verified Brevo sender (see brevo-setup.sh)
// Optional:
//   SENDER_NAME                     display name (default "Stamina")
//   GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET
//                                   Stamina's own Google OAuth client; both unset skips Google with a note
//   WEB_ORIGINS                     comma-separated web origins when no --web-origin is given; falls back to
//                                   PROD_WEB_URL, then https://$CLOUDFLARE_PAGES_PROJECT.pages.dev
//   NEON_API_BASE                   API root (default https://console.neon.tech/api/v2; tests use a mock)
//
// --branch        branch id (br-...) or name; default "dev". The `dev` branch is the parent of every
//                 preview branch, so what is set here is inherited by previews (Neon copies a branch's auth
//                 configuration with its data). Run it again with --branch main for production.
// --web-origin    an origin that serves the web app (https, no path); repeatable. Added as a trusted domain.
//                 Required for every branch except `dev`, where `localhost` is allowed instead.
// --preview       what preview.yml needs for a PR branch: make sure Auth is enabled, trust --web-origin,
//                 print `base_url` and append `base_url=` to $GITHUB_OUTPUT. Nothing else is changed (SMTP,
//                 Google and email sign-in are inherited from the parent branch), so no SMTP or Google
//                 variables are needed.
// --dry-run       print every request with secrets redacted and send nothing; needs no keys.
//
// Neon API reference (https://neon.com/docs/reference/api/auth/), read when this was written:
//   POST  /projects/{p}/branches/{b}/auth                      {auth_provider: "better_auth"} -> {base_url, jwks_url}
//   GET   /projects/{p}/branches/{b}/auth                      -> {base_url, jwks_url, ...}
//   PATCH /projects/{p}/branches/{b}/auth/email_and_password   {enabled: true} ("Sign-up and Sign-in with Email")
//   PATCH /projects/{p}/branches/{b}/auth/allow_localhost      {allow_localhost: boolean}
//   GET|POST /projects/{p}/branches/{b}/auth/domains           {domain, auth_provider: "better_auth"}
//   PATCH /projects/{p}/branches/{b}/auth/email_provider       {type: "standard", host, port, username, password,
//                                                               sender_email, sender_name} (the `type` field is
//                                                               in the production checklist's curl example)
//   GET|POST /projects/{p}/branches/{b}/auth/oauth_providers   {id: "google", client_id, client_secret}
//   PATCH /projects/{p}/branches/{b}/auth/oauth_providers/{id} {client_id, client_secret}
//   GET   /projects/{p}/branches                               ?search=<name>&limit=100 -> {branches: [{id, name}]}
//
// [INFERENCE] Not confirmed against a live Neon project (none was reachable when this was written):
//   * The status code and message when Auth is already enabled (POST), and what GET returns when it is not
//     (a 404 is assumed; any non-2xx GET falls through to the POST, and a failing POST that says "already"
//     or answers 409 falls back to GET).
//   * Email OTP needs no switch of its own: Neon's Email OTP guide lists only "Sign-up and Sign-in with
//     Email" as a prerequisite, and the Neon API has no email-otp endpoint.
//   * That PATCH .../oauth_providers/google turns Neon's shared Google credentials into our own; the
//     shared entry is listed by GET, so it is patched rather than POSTed again.
//   * Branch search (`?search=`) is filtered to an exact name client-side, so it can only be too wide.
//   * Whether the secrets come back redacted on a later GET (they are never compared, only re-sent).
//
// Not possible over the API (docs/auth.md has the runbook): generating the Brevo SMTP key, creating the
// Google Cloud OAuth client and registering its redirect URI, "Verify email at sign-up".
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = join(dirname(scriptPath), '..', '..');

const NEON_API = 'https://console.neon.tech/api/v2';
const DEV_BRANCH = 'dev';
const BRANCH_ID = /^br-[a-z0-9-]+$/;
const AUTH_PROVIDER = 'better_auth';
const SMTP_HOST = 'smtp-relay.brevo.com';
const SMTP_PORT = 587;
const GOOGLE = 'google';
const SECRET_FIELDS = new Set(['password', 'client_secret']);
const RETRY_STATUSES = new Set([423, 503]); // Neon documents both as safe to retry
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

class UsageError extends Error {}

const usage = () =>
  readFileSync(scriptPath, 'utf-8')
    .split('\n')
    .slice(1)
    .filter((line, index, lines) => lines.slice(0, index + 1).every((l) => l.startsWith('//')))
    .map((line) => line.replace(/^\/\/ ?/, ''))
    .join('\n');

function parseArgs(argv) {
  const options = { branch: DEV_BRANCH, webOrigins: [], preview: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--preview') options.preview = true;
    else if (arg === '--branch' || arg === '--web-origin') {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new UsageError(`${arg} needs a value`);
      if (arg === '--branch') options.branch = value;
      else options.webOrigins.push(value);
    } else if (arg === '-h' || arg === '--help') options.help = true;
    else throw new UsageError(`unknown argument: ${arg}`);
  }
  return options;
}

function loadEnvFile() {
  const file = process.env.ENV_FILE ?? join(root, '.env');
  try {
    process.loadEnvFile(file); // never overrides variables that are already set
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const need = (name, hint) => {
  const value = process.env[name];
  if (!value) throw new UsageError(`${name} is required${hint ? ` (${hint})` : ''}`);
  return value;
};

/** Normalises an origin; rejects paths, wildcards and anything that is not https. */
function toOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new UsageError(`web origin is not a URL: ${value}`);
  }
  if (
    url.protocol !== 'https:' ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    /[*]/.test(value)
  ) {
    throw new UsageError(`web origin must be https://host with no path or wildcard: ${value}`);
  }
  return url.origin;
}

function resolveWebOrigins(options) {
  const fromEnv = (process.env.WEB_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const pages = process.env.CLOUDFLARE_PAGES_PROJECT
    ? [`https://${process.env.CLOUDFLARE_PAGES_PROJECT}.pages.dev`]
    : [];
  const candidates = [
    options.webOrigins,
    fromEnv,
    process.env.PROD_WEB_URL ? [process.env.PROD_WEB_URL] : [],
    pages,
  ].find((list) => list.length > 0);
  return [...new Set((candidates ?? []).map(toOrigin))];
}

const redact = (body) =>
  body &&
  Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, SECRET_FIELDS.has(k) ? '<redacted>' : v]),
  );

const ENDPOINT_POLLS = 30;
const ENDPOINT_POLL_MS = Number(process.env.NEON_ENDPOINT_POLL_MS ?? 2000);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createNeon({ base, apiKey, projectId }) {
  const headers = { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' };
  return async function call(method, path, body) {
    for (let attempt = 1; ; attempt++) {
      const response = await fetch(`${base}/projects/${projectId}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await response.text();
      if (RETRY_STATUSES.has(response.status) && attempt < RETRY_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      let json;
      try {
        json = text ? JSON.parse(text) : undefined;
      } catch {
        json = undefined;
      }
      return { ok: response.ok, status: response.status, json, text };
    }
  };
}

const fail = (what, res) => {
  throw new Error(`${what} failed: HTTP ${res.status} ${res.text.slice(0, 600)}`);
};

/**
 * Neon Auth keeps its data in the branch's database, so the branch needs a read-write compute
 * endpoint ("no read-write endpoint found for branch" otherwise). A data-free parent branch such as
 * `dev` has none until one is created; it scales to zero when idle. Waits until it has left `init`.
 */
async function ensureEndpoint(neon, branchId) {
  const listed = await neon('GET', `/branches/${branchId}/endpoints`);
  if (!listed.ok) fail('listing the branch endpoints', listed);
  const existing = (listed.json?.endpoints ?? []).find((e) => e.type === 'read_write');
  if (existing) return { id: existing.id, created: false };
  const created = await neon('POST', '/endpoints', {
    endpoint: { branch_id: branchId, type: 'read_write' },
  });
  if (!created.ok) fail('creating a read-write endpoint', created);
  const id = created.json?.endpoint?.id;
  for (let attempt = 0; id && attempt < ENDPOINT_POLLS; attempt++) {
    const res = await neon('GET', `/endpoints/${id}`);
    if (res.ok && res.json?.endpoint?.current_state !== 'init') break;
    await sleep(ENDPOINT_POLL_MS);
  }
  return { id, created: true };
}

/** Returns the branch's Neon Auth integration, enabling it when the branch has none yet. */
async function ensureAuth(neon, branchId) {
  const path = `/branches/${branchId}/auth`;
  const existing = await neon('GET', path);
  if (existing.ok) return { auth: existing.json, enabled: false };
  const created = await neon('POST', path, { auth_provider: AUTH_PROVIDER });
  if (created.ok) return { auth: created.json, enabled: true };
  if (created.status === 409 || /already/i.test(created.text)) {
    const again = await neon('GET', path);
    if (again.ok) return { auth: again.json, enabled: false };
    fail('reading Neon Auth', again);
  }
  return fail('enabling Neon Auth', created);
}

async function ensureDomains(neon, branchId, origins) {
  const path = `/branches/${branchId}/auth/domains`;
  const listed = await neon('GET', path);
  if (!listed.ok) fail('listing trusted domains', listed);
  const have = new Set(
    (listed.json?.domains ?? []).map((d) => String(d.domain).replace(/\/$/, '')),
  );
  const added = [];
  for (const domain of origins) {
    if (have.has(domain)) continue;
    const res = await neon('POST', path, { domain, auth_provider: AUTH_PROVIDER });
    if (!res.ok) fail(`trusting ${domain}`, res);
    added.push(domain);
  }
  return { added, present: origins.filter((o) => !added.includes(o)) };
}

async function resolveBranch(neon, ref) {
  if (BRANCH_ID.test(ref)) {
    const res = await neon('GET', `/branches/${ref}`);
    if (!res.ok) fail(`reading branch ${ref}`, res);
    return { id: res.json.branch.id, name: res.json.branch.name };
  }
  const res = await neon('GET', `/branches?search=${encodeURIComponent(ref)}&limit=100`);
  if (!res.ok) fail('listing branches', res);
  const branches = res.json?.branches ?? [];
  const found = branches.find((b) => b.name === ref);
  if (!found) {
    throw new Error(
      `no branch named "${ref}" in the project (found: ${branches.map((b) => b.name).join(', ') || 'none'})`,
    );
  }
  return { id: found.id, name: found.name };
}

/** The Brevo SMTP settings from the environment; --dry-run shows placeholders for what is unset. */
function smtpFromEnv(dryRun) {
  const value = (name, hint) => (dryRun && !process.env[name] ? `<${name}>` : need(name, hint));
  const senderEmail = value('SENDER_EMAIL', 'the From address of the sign-in emails');
  if (!dryRun || process.env.SENDER_EMAIL) {
    if (!EMAIL.test(senderEmail)) throw new UsageError('SENDER_EMAIL is not an email address');
  }
  return {
    type: 'standard',
    host: SMTP_HOST,
    port: SMTP_PORT,
    username: value('BREVO_SMTP_LOGIN', 'Brevo > SMTP & API > SMTP > Login'),
    password: value('BREVO_SMTP_KEY', 'Brevo > SMTP & API > SMTP > Generate a new SMTP key'),
    sender_email: senderEmail,
    sender_name: process.env.SENDER_NAME || 'Stamina',
  };
}

function googleFromEnv() {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!id && !secret) return undefined;
  if (!id || !secret) {
    throw new UsageError(
      'set both GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET, or neither',
    );
  }
  return { client_id: id, client_secret: secret };
}

async function ensureGoogle(neon, branchId, credentials) {
  const path = `/branches/${branchId}/auth/oauth_providers`;
  const listed = await neon('GET', path);
  if (!listed.ok) fail('listing OAuth providers', listed);
  const exists = (listed.json?.providers ?? []).some((p) => p.id === GOOGLE);
  const res = exists
    ? await neon('PATCH', `${path}/${GOOGLE}`, credentials)
    : await neon('POST', path, { id: GOOGLE, ...credentials });
  if (!res.ok) fail('configuring Google OAuth', res);
  return exists ? 'updated' : 'added';
}

/** `branchName` is undefined while the branch is only known by id. */
function requireOrigins(options, branchName, origins) {
  if (options.preview) {
    if (options.webOrigins.length === 0) throw new UsageError('--preview needs --web-origin');
  } else if (branchName !== undefined && branchName !== DEV_BRANCH && origins.length === 0) {
    throw new UsageError(
      `branch "${branchName}" needs a web origin: pass --web-origin, or set WEB_ORIGINS / PROD_WEB_URL / CLOUDFLARE_PAGES_PROJECT`,
    );
  }
}

function printDryRun({ options, origins, smtp, google }) {
  const isDev = options.branch === DEV_BRANCH;
  const project = '/projects/<NEON_PROJECT_ID>';
  const byId = BRANCH_ID.test(options.branch);
  const b = `${project}/branches/${byId ? options.branch : `<branch id of "${options.branch}">`}`;
  const lines = [];
  const add = (method, path, note, body) => {
    lines.push(`  ${method.padEnd(5)} ${path}${note ? `   ${note}` : ''}`);
    if (body) lines.push(`        ${JSON.stringify(redact(body))}`);
  };

  add(
    'GET',
    byId ? b : `${project}/branches?search=${encodeURIComponent(options.branch)}&limit=100`,
    'resolve the branch',
  );
  add('GET', `${b}/endpoints`, 'does the branch have a read-write compute endpoint?');
  add(
    'POST',
    `${project}/endpoints`,
    'only when it has none (Neon Auth needs one; scales to zero)',
    {
      endpoint: { branch_id: '<branch id>', type: 'read_write' },
    },
  );
  add('GET', `${b}/auth`, 'read the integration and its base_url');
  add('POST', `${b}/auth`, 'only when Auth is not enabled yet', { auth_provider: AUTH_PROVIDER });
  if (!options.preview) {
    add('PATCH', `${b}/auth/email_and_password`, 'sign-up and sign-in with email (Email OTP)', {
      enabled: true,
    });
    add(
      'PATCH',
      `${b}/auth/allow_localhost`,
      isDev ? 'dev branch: localhost allowed' : 'other branches: localhost blocked',
      { allow_localhost: isDev },
    );
  }
  add('GET', `${b}/auth/domains`, 'trusted domains already present');
  for (const domain of origins) {
    add('POST', `${b}/auth/domains`, 'only when missing', { domain, auth_provider: AUTH_PROVIDER });
  }
  if (options.preview) {
    lines.push('  then appends base_url=<the branch auth base_url> to $GITHUB_OUTPUT');
  } else {
    add('PATCH', `${b}/auth/email_provider`, 'Brevo SMTP for the sign-in emails', smtp);
    if (google) {
      add('GET', `${b}/auth/oauth_providers`, 'is Google listed already?');
      add('PATCH', `${b}/auth/oauth_providers/${GOOGLE}`, 'when it is listed', google);
      add('POST', `${b}/auth/oauth_providers`, 'when it is not', { id: GOOGLE, ...google });
    } else {
      lines.push(
        '  (Google OAuth skipped: GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET are not set)',
      );
    }
  }

  console.log(
    'dry run: nothing is sent. A real run sends, in order (header authorization: Bearer <NEON_API_KEY>),',
  );
  console.log(`to ${process.env.NEON_API_BASE ?? NEON_API}:`);
  console.log(lines.join('\n'));
}

function printSummary({
  branch,
  auth,
  enabled,
  domains,
  localhostAllowed,
  options,
  google,
  googleResult,
}) {
  const baseUrl = auth.base_url;
  const jwks = auth.jwks_url ?? `${baseUrl}/.well-known/jwks.json`;
  console.log(
    `Neon Auth on branch ${branch.name} (${branch.id}): ${enabled ? 'enabled just now' : 'already enabled'}`,
  );
  for (const domain of domains.added) console.log(`  trusted domain added    ${domain}`);
  for (const domain of domains.present) console.log(`  trusted domain present  ${domain}`);
  if (!options.preview) {
    console.log('  email sign-in           enabled (Email OTP needs no further switch)');
    console.log(
      `  localhost               ${localhostAllowed ? 'allowed (dev branch)' : 'blocked'}`,
    );
    console.log(
      `  sign-in emails          Brevo ${SMTP_HOST}:${SMTP_PORT}, from ${process.env.SENDER_EMAIL}`,
    );
    console.log(
      google
        ? `  Google OAuth            ${googleResult} (client ${google.client_id})`
        : [
            '  Google OAuth            skipped: GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET are not set.',
            "                          The branch keeps Neon's shared Google credentials, for development only.",
          ].join('\n'),
    );
  }
  console.log(`
Values to keep:
  NEON_AUTH_BASE_URL   ${baseUrl}
  JWKS                 ${jwks}
  Google redirect URI  ${baseUrl}/callback/${GOOGLE}
                       (Google Cloud Console > APIs & Services > Credentials > the OAuth client > Authorized redirect URIs)`);
  if (options.preview) return;
  console.log(
    localhostAllowed
      ? `\nFor local work: NEON_AUTH_BASE_URL=${baseUrl} in apps/api/.env and AUTH_PROXY_TARGET=${baseUrl} in apps/web/.env.local.`
      : `\nStore it for the release workflow:  gh variable set NEON_AUTH_BASE_URL --body '${baseUrl}'`,
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return console.log(usage());
  loadEnvFile();

  const origins = resolveWebOrigins(options);
  const byId = BRANCH_ID.test(options.branch);
  // A branch given by name is known now, so a missing origin fails before any request is sent.
  requireOrigins(options, byId ? undefined : options.branch, origins);
  const smtp = options.preview ? undefined : smtpFromEnv(options.dryRun);
  const google = options.preview ? undefined : googleFromEnv();

  if (options.dryRun) return printDryRun({ options, origins, smtp, google });

  const neon = createNeon({
    base: process.env.NEON_API_BASE ?? NEON_API,
    apiKey: need('NEON_API_KEY'),
    projectId: need('NEON_PROJECT_ID'),
  });
  const branch = await resolveBranch(neon, options.branch);
  requireOrigins(options, branch.name, origins);
  const localhostAllowed = branch.name === DEV_BRANCH;
  const endpoint = await ensureEndpoint(neon, branch.id);
  if (endpoint.created)
    console.log(
      `created a read-write compute endpoint ${endpoint.id} on ${branch.name} (scales to zero when idle)`,
    );
  const { auth, enabled } = await ensureAuth(neon, branch.id);
  if (!auth?.base_url) throw new Error('Neon returned no base_url for the Auth integration');

  if (!options.preview) {
    const email = await neon('PATCH', `/branches/${branch.id}/auth/email_and_password`, {
      enabled: true,
    });
    if (!email.ok) fail('enabling email sign-in', email);
    const localhost = await neon('PATCH', `/branches/${branch.id}/auth/allow_localhost`, {
      allow_localhost: localhostAllowed,
    });
    if (!localhost.ok) fail('setting allow_localhost', localhost);
  }
  const domains = await ensureDomains(neon, branch.id, origins);
  let googleResult;
  if (!options.preview) {
    const provider = await neon('PATCH', `/branches/${branch.id}/auth/email_provider`, smtp);
    if (!provider.ok) fail('configuring the SMTP provider', provider);
    if (google) googleResult = await ensureGoogle(neon, branch.id, google);
  }

  printSummary({ branch, auth, enabled, domains, localhostAllowed, options, google, googleResult });
  if (options.preview) {
    if (enabled) {
      console.warn(
        'warning: the preview branch had no Auth integration (the parent branch has none), so it was enabled with defaults. Run scripts/ops/neon-auth-setup.mjs on the parent branch.',
      );
    }
    if (process.env.GITHUB_OUTPUT)
      appendFileSync(process.env.GITHUB_OUTPUT, `base_url=${auth.base_url}\n`);
  }
}

main().catch((error) => {
  const usageProblem = error instanceof UsageError;
  console.error(usageProblem ? error.message : `error: ${error.message}`);
  if (usageProblem) console.error(`\n${usage()}`);
  process.exit(usageProblem ? 2 : 1);
});
