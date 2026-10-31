// Offline tests for the setup scripts OpenTofu cannot replace: infra/bootstrap.sh,
// scripts/ops/{uptimerobot,brevo,deno}-setup.sh, scripts/ops/neon-auth-setup.mjs and the request
// shape of scripts/deno-deploy.mjs. Each script runs for real against a mock HTTP server started
// here, so argument handling, find-or-create idempotency and secret hygiene are exercised without
// any vendor account.
//
//   node --test infra/test/ops-scripts.test.mjs
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Starts a mock vendor API; `handler(req, url, body, state)` returns [status, json]. */
async function mock(handler) {
  const state = { requests: [] };
  const server = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const url = new URL(req.url, 'http://mock');
    const body = raw ? JSON.parse(raw) : undefined;
    state.requests.push({
      method: req.method,
      path: url.pathname + url.search,
      headers: req.headers,
      body,
    });
    const [status, json] = handler(req, url, body, state);
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(json));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  state.url = `http://127.0.0.1:${server.address().port}`;
  state.close = () => server.close();
  state.count = (method) => state.requests.filter((r) => r.method === method).length;
  return state;
}

/** Runs `command file args` with a clean environment (no .env, no inherited secrets). */
function exec(command, file, args, env) {
  return new Promise((resolve) => {
    execFile(
      command,
      [file, ...args],
      { env: { PATH: process.env.PATH, HOME: process.env.HOME, ENV_FILE: '/nonexistent', ...env } },
      (error, stdout, stderr) =>
        resolve({ code: error ? error.code : 0, stdout, stderr, all: stdout + stderr }),
    );
  });
}

const run = (script, args, env) => exec('bash', join(root, script), args, env);
const runNode = (script, args, env) => exec('node', script, args, env);

describe('uptimerobot-setup.sh', () => {
  const key = 'ur-secret-key-123';
  const baseEnv = (api) => ({
    UPTIMEROBOT_API_KEY: key,
    PROD_API_URL: 'https://stamina-api.example.deno.net/',
    ALERT_EMAIL: 'Vang@Example.com',
    UPTIMEROBOT_API_BASE: `${api.url}/v3`,
  });
  const handler = (_req, url, body, state) => {
    state.contacts ??= [];
    state.monitors ??= [];
    const { pathname, searchParams } = url;
    const method = _req.method;
    if (pathname === '/v3/user/me') return [200, { email: 'owner@example.com' }];
    if (pathname === '/v3/alert-contacts' && method === 'GET') {
      if (state.paginate && !searchParams.has('cursor'))
        return [200, { nextLink: '7', data: state.contacts.slice(0, 1) }];
      return [
        200,
        { nextLink: null, data: state.paginate ? state.contacts.slice(1) : state.contacts },
      ];
    }
    if (pathname === '/v3/alert-contacts' && method === 'POST') {
      const contact = { id: 100 + state.contacts.length, ...body };
      state.contacts.push(contact);
      return [201, contact];
    }
    if (pathname === '/v3/monitors' && method === 'GET')
      return [200, { nextLink: null, data: state.monitors }];
    if (pathname === '/v3/monitors' && method === 'POST') {
      const monitor = { id: 500 + state.monitors.length, ...body };
      state.monitors.push(monitor);
      return [201, monitor];
    }
    const match = pathname.match(/^\/v3\/monitors\/(\d+)$/);
    if (match && method === 'PATCH') {
      const monitor = state.monitors.find((m) => String(m.id) === match[1]);
      Object.assign(monitor, body);
      return [200, monitor];
    }
    return [404, { code: 'not_found' }];
  };

  it('--dry-run sends nothing and needs no key', async () => {
    const api = await mock(handler);
    const result = await run('scripts/ops/uptimerobot-setup.sh', ['--dry-run'], {
      ...baseEnv(api),
      UPTIMEROBOT_API_KEY: '',
    });
    api.close();
    assert.equal(result.code, 0);
    assert.equal(api.requests.length, 0);
    assert.match(result.stdout, /POST .*\/monitors/);
    assert.match(result.stdout, /"interval":300/);
    assert.match(result.stdout, /https:\/\/stamina-api\.example\.deno\.net\/health/);
  });

  it('rejects unknown arguments, a non-https URL and a bad email', async () => {
    const api = await mock(handler);
    api.close();
    assert.equal((await run('scripts/ops/uptimerobot-setup.sh', ['--nope'], baseEnv(api))).code, 2);
    assert.equal(
      (
        await run('scripts/ops/uptimerobot-setup.sh', ['--dry-run'], {
          ...baseEnv(api),
          PROD_API_URL: 'http://x.test',
        })
      ).code,
      2,
    );
    assert.equal(
      (
        await run('scripts/ops/uptimerobot-setup.sh', ['--dry-run'], {
          ...baseEnv(api),
          ALERT_EMAIL: 'nope',
        })
      ).code,
      2,
    );
  });

  it('creates the contact and the monitor once, then reports up to date', async () => {
    const api = await mock(handler);
    const first = await run('scripts/ops/uptimerobot-setup.sh', [], baseEnv(api));
    assert.equal(first.code, 0, first.all);
    assert.match(first.stdout, /created alert contact/);
    assert.match(first.stdout, /created monitor/);
    const monitor = api.monitors[0];
    assert.equal(monitor.url, 'https://stamina-api.example.deno.net/health');
    assert.equal(monitor.interval, 300);
    assert.equal(monitor.type, 'HTTP');
    assert.deepEqual(monitor.assignedAlertContacts, [
      { alertContactId: 100, threshold: 0, recurrence: 0 },
    ]);
    assert.equal(api.contacts[0].value, 'Vang@Example.com');

    const writes = api.requests.filter((r) => r.method !== 'GET').length;
    const second = await run('scripts/ops/uptimerobot-setup.sh', [], baseEnv(api));
    api.close();
    assert.equal(second.code, 0, second.all);
    assert.match(second.stdout, /exists \(id 100\)/);
    assert.match(second.stdout, /up to date/);
    assert.equal(
      api.requests.filter((r) => r.method !== 'GET').length,
      writes,
      'second run must not write',
    );
    for (const r of api.requests) assert.equal(r.headers.authorization, `Bearer ${key}`);
    assert.ok(
      !first.all.includes(key) && !second.all.includes(key),
      'the key must never be printed',
    );
  });

  it('reuses an existing contact (case-insensitive, across pages) and patches drift', async () => {
    const api = await mock(handler);
    api.paginate = true;
    api.contacts = [
      { id: 1, type: 'Email', value: 'other@example.com' },
      { id: 2, type: 'Email', value: 'vang@example.com' },
    ];
    api.monitors = [
      {
        id: 9,
        friendlyName: 'stamina-api /health',
        url: 'https://old.example.com/health',
        interval: 60,
        assignedAlertContacts: [{ alertContactId: 1, threshold: 0, recurrence: 0 }],
      },
    ];
    const result = await run('scripts/ops/uptimerobot-setup.sh', [], baseEnv(api));
    api.close();
    assert.equal(result.code, 0, result.all);
    assert.equal(api.count('POST'), 0);
    assert.match(result.stdout, /exists \(id 2\)/);
    assert.match(result.stdout, /updated monitor/);
    assert.equal(api.monitors[0].url, 'https://stamina-api.example.deno.net/health');
    assert.equal(api.monitors[0].interval, 300);
    assert.deepEqual(
      api.monitors[0].assignedAlertContacts.map((c) => c.alertContactId).sort(),
      [1, 2],
      'existing contacts are kept',
    );
  });

  it('fails clearly when the key is rejected', async () => {
    const api = await mock(() => [401, { code: '000-001' }]);
    const result = await run('scripts/ops/uptimerobot-setup.sh', [], baseEnv(api));
    api.close();
    assert.equal(result.code, 1);
    assert.match(result.stderr, /HTTP 401/);
  });
});

describe('brevo-setup.sh', () => {
  const key = 'xkeysib-secret-456';
  const account = {
    email: 'owner@example.com',
    relay: {
      enabled: true,
      data: { relay: 'smtp-relay.brevo.com', port: 587, userName: 'owner@example.com' },
    },
  };
  const handler = (account_) => (req, url, body, state) => {
    state.senders ??= [];
    if (url.pathname === '/v3/account') return [200, account_];
    if (url.pathname === '/v3/senders' && req.method === 'GET')
      return [200, { senders: state.senders }];
    if (url.pathname === '/v3/senders' && req.method === 'POST') {
      state.senders.push({ id: 7, active: false, ...body });
      return [201, { id: 7 }];
    }
    return [404, {}];
  };
  const envFor = (api) => ({
    BREVO_API_KEY: key,
    SENDER_EMAIL: 'hello@example.eu',
    BREVO_API_BASE: `${api.url}/v3`,
  });

  it('--dry-run sends nothing', async () => {
    const api = await mock(handler(account));
    const result = await run('scripts/ops/brevo-setup.sh', ['--dry-run'], {
      ...envFor(api),
      BREVO_API_KEY: '',
    });
    api.close();
    assert.equal(result.code, 0);
    assert.equal(api.requests.length, 0);
    assert.match(result.stdout, /POST .*\/senders/);
  });

  it('creates the sender once and prints the SMTP settings without the key', async () => {
    const api = await mock(handler(account));
    const first = await run('scripts/ops/brevo-setup.sh', [], envFor(api));
    const second = await run('scripts/ops/brevo-setup.sh', [], envFor(api));
    api.close();
    assert.equal(first.code, 0, first.all);
    assert.match(first.stdout, /created sender hello@example\.eu/);
    assert.match(first.stdout, /host\s+smtp-relay\.brevo\.com/);
    assert.match(first.stdout, /port\s+587/);
    assert.match(first.stdout, /login\s+owner@example\.com/);
    assert.equal(second.code, 0, second.all);
    assert.match(second.stdout, /sender hello@example\.eu exists/);
    assert.equal(api.count('POST'), 1, 'the second run must not create again');
    for (const r of api.requests) assert.equal(r.headers['api-key'], key);
    assert.ok(
      !first.all.includes(key) && !second.all.includes(key),
      'the key must never be printed',
    );
  });

  it('fails when the SMTP relay is not enabled', async () => {
    const api = await mock(
      handler({ ...account, relay: { enabled: false, data: account.relay.data } }),
    );
    const result = await run('scripts/ops/brevo-setup.sh', [], envFor(api));
    api.close();
    assert.equal(result.code, 1);
    assert.match(result.stderr, /relay is not enabled/);
    assert.equal(api.count('POST'), 0);
  });

  it('rejects a malformed sender address', async () => {
    const result = await run('scripts/ops/brevo-setup.sh', ['--dry-run'], { SENDER_EMAIL: 'nope' });
    assert.equal(result.code, 2);
  });
});

describe('deno-setup.sh', () => {
  const token = 'deno-secret-token-789';
  const handler = (config) => (req, url) => {
    if (url.pathname === '/v2/apps/stamina-api') {
      if (!config.exists) return [404, { code: 'APP_NOT_FOUND' }];
      return [
        200,
        {
          id: 'app-uuid',
          slug: 'stamina-api',
          env_vars: [
            { key: 'FIELD_ENCRYPTION_KEY', secret: true },
            { key: 'LOG_LEVEL', value: 'super-visible-value', secret: false },
            ...(config.appDatabaseUrl ? [{ key: 'DATABASE_URL', secret: true }] : []),
          ],
        },
      ];
    }
    if (url.pathname === '/v2/apps/stamina-api/revisions') {
      return [
        200,
        [
          { id: 'rev-preview', status: 'succeeded' },
          { id: 'rev-prod', status: 'succeeded' },
        ],
      ];
    }
    if (url.pathname === '/v2/revisions/rev-preview') {
      return [
        200,
        { timelines: [{ name: 'pr-1', context: 'preview', hostnames: ['preview.example.net'] }] },
      ];
    }
    if (url.pathname === '/v2/revisions/rev-prod') {
      return [
        200,
        {
          timelines: config.production
            ? [
                {
                  name: 'Production',
                  context: 'production',
                  hostnames: ['stamina-api.vangaris.deno.net'],
                },
              ]
            : [],
        },
      ];
    }
    return [404, {}];
  };
  const envFor = (api, extra = {}) => ({
    DENO_DEPLOY_TOKEN: token,
    DENO_API_BASE: `${api.url}/v2`,
    ...extra,
  });

  it('reports the app, variable names (never values) and the production hostname', async () => {
    const api = await mock(handler({ exists: true, production: true }));
    const result = await run(
      'scripts/ops/deno-setup.sh',
      [],
      envFor(api, { PROD_API_URL: 'https://stamina-api.vangaris.deno.net' }),
    );
    api.close();
    assert.equal(result.code, 0, result.all);
    assert.match(result.stdout, /app stamina-api exists in organisation vangaris/);
    assert.match(result.stdout, /FIELD_ENCRYPTION_KEY \(secret\), LOG_LEVEL/);
    assert.ok(!result.all.includes('super-visible-value'), 'values must not be printed');
    assert.match(result.stdout, /production hostname\(s\): stamina-api\.vangaris\.deno\.net/);
    assert.match(result.stdout, /PROD_API_URL matches/);
    assert.ok(!result.all.includes(token));
    assert.equal(api.requests.filter((r) => r.method !== 'GET').length, 0);
    for (const r of api.requests) assert.equal(r.headers.authorization, `Bearer ${token}`);
  });

  it('fails when PROD_API_URL is not the production hostname', async () => {
    const api = await mock(handler({ exists: true, production: true }));
    const result = await run(
      'scripts/ops/deno-setup.sh',
      [],
      envFor(api, { PROD_API_URL: 'https://elsewhere.example.net' }),
    );
    api.close();
    assert.equal(result.code, 1);
    assert.match(result.stderr, /not one of the production hostnames/);
  });

  it('says so when no production revision exists yet', async () => {
    const api = await mock(handler({ exists: true, production: false }));
    const result = await run('scripts/ops/deno-setup.sh', [], envFor(api));
    api.close();
    assert.equal(result.code, 0, result.all);
    assert.match(result.stdout, /none yet/);
  });

  it('warns about an app-level DATABASE_URL', async () => {
    const api = await mock(handler({ exists: true, appDatabaseUrl: true }));
    const result = await run('scripts/ops/deno-setup.sh', [], envFor(api));
    api.close();
    assert.match(result.stderr, /DATABASE_URL is set at app level/);
  });

  it('fails with the create command when the app is missing, and --dry-run --create sends nothing', async () => {
    const api = await mock(handler({ exists: false }));
    const missing = await run('scripts/ops/deno-setup.sh', [], envFor(api));
    assert.equal(missing.code, 1);
    assert.match(missing.stderr, /does not exist/);
    assert.match(missing.stderr, /--create/);
    const before = api.requests.length;
    const dry = await run('scripts/ops/deno-setup.sh', ['--dry-run', '--create'], {
      DENO_API_BASE: `${api.url}/v2`,
    });
    api.close();
    assert.equal(dry.code, 0);
    assert.equal(api.requests.length, before);
    assert.match(dry.stdout, /deno deploy create --org vangaris --app stamina-api .* --region eu/);
  });

  it('rejects an invalid app slug', async () => {
    const result = await run('scripts/ops/deno-setup.sh', ['--dry-run'], { DENO_APP: 'Bad_Slug' });
    assert.equal(result.code, 2);
  });
});

describe('neon-auth-setup.mjs', () => {
  const script = join(root, 'scripts/ops/neon-auth-setup.mjs');
  const apiKey = 'napi-secret-key-111';
  const smtpKey = 'xsmtp-secret-222';
  const googleSecret = 'GOCSPX-secret-333';
  const baseUrl = 'https://ep-test.neonauth.eu-central-1.aws.neon.tech/neondb/auth';
  const prefix = '/api/v2/projects/proj-1/branches';

  /** A Neon project with branches dev (br-dev-1) and main (br-main-1); `auth` maps branch id -> state. */
  const neon = () => {
    const auth = {};
    // Every branch has a read-write compute endpoint unless a test removes it.
    const endpoints = {
      'br-dev-1': [{ id: 'ep-dev-1', type: 'read_write', current_state: 'idle' }],
      'br-main-1': [{ id: 'ep-main-1', type: 'read_write', current_state: 'idle' }],
      'br-pr-7': [{ id: 'ep-pr-7', type: 'read_write', current_state: 'idle' }],
    };
    const state = { auth, endpoints };
    return [
      (req, url, body) => {
        const path = url.pathname;
        if (path === '/api/v2/projects/proj-1/endpoints' && req.method === 'POST') {
          const created = {
            id: `ep-new-${body.endpoint.branch_id}`,
            ...body.endpoint,
            current_state: 'init',
          };
          endpoints[body.endpoint.branch_id] = [created];
          return [201, { endpoint: created }];
        }
        if (path.startsWith('/api/v2/projects/proj-1/endpoints/')) {
          const id = path.split('/').pop();
          const found = Object.values(endpoints)
            .flat()
            .find((e) => e.id === id);
          if (!found) return [404, {}];
          found.current_state = 'idle';
          return [200, { endpoint: found }];
        }
        if (!path.startsWith(prefix)) return [404, {}];
        const rest = path.slice(prefix.length);
        const branches = [
          { id: 'br-dev-1', name: 'dev' },
          { id: 'br-main-1', name: 'main' },
          { id: 'br-pr-7', name: 'preview/pr-7' },
        ];
        if (rest === '') return [200, { branches }];
        const [, id, ...tail] = rest.split('/');
        const branch = branches.find((b) => b.id === id);
        if (!branch) return [404, { code: 'NOT_FOUND' }];
        if (tail.length === 0) return [200, { branch }];
        if (tail[0] === 'endpoints') return [200, { endpoints: endpoints[id] ?? [] }];
        if (tail[0] !== 'auth') return [404, {}];
        const section = tail.slice(1).join('/');
        const a = auth[id];
        if (section === '') {
          if (req.method === 'GET') return a ? [200, a.info] : [404, { code: 'AUTH_NOT_ENABLED' }];
          if (a) return [409, { code: 'CONFLICT', message: 'Neon Auth is already enabled' }];
          auth[id] = {
            info: { auth_provider: 'better_auth', base_url: `${baseUrl}/${id}` },
            domains: [],
            providers: [{ id: 'google', type: 'shared' }],
            patches: {},
          };
          return [201, auth[id].info];
        }
        if (!a) return [404, { code: 'AUTH_NOT_ENABLED' }];
        if (section === 'domains' && req.method === 'GET') return [200, { domains: a.domains }];
        if (section === 'domains') {
          a.domains.push({ domain: body.domain, auth_provider: body.auth_provider });
          return [201, {}];
        }
        if (section === 'oauth_providers' && req.method === 'GET')
          return [200, { providers: a.providers }];
        if (section === 'oauth_providers') {
          a.providers.push({ id: body.id, type: 'standard' });
          return [200, body];
        }
        if (section.startsWith('oauth_providers/')) {
          a.patches[section] = body;
          return [200, body];
        }
        if (req.method === 'PATCH') {
          a.patches[section] = body;
          return [200, body];
        }
        return [404, {}];
      },
      state,
    ];
  };
  const start = async (initial) => {
    const [handler, state] = neon(initial);
    const api = await mock(handler);
    return { api, state };
  };
  const envFor = (api, extra = {}) => ({
    NEON_API_KEY: apiKey,
    NEON_PROJECT_ID: 'proj-1',
    NEON_API_BASE: `${api.url}/api/v2`,
    BREVO_SMTP_LOGIN: 'login@smtp-brevo.com',
    BREVO_SMTP_KEY: smtpKey,
    SENDER_EMAIL: 'hello@example.eu',
    ...extra,
  });
  const google = { GOOGLE_OAUTH_CLIENT_ID: 'client-123', GOOGLE_OAUTH_CLIENT_SECRET: googleSecret };
  const secrets = [apiKey, smtpKey, googleSecret];
  const noSecrets = (result) => {
    for (const secret of secrets) assert.ok(!result.all.includes(secret), `leaked ${secret}`);
  };
  const sent = (api, method, suffix) =>
    api.requests.filter((r) => r.method === method && r.path.endsWith(suffix));

  it('creates a read-write endpoint on a branch that has none, and leaves an existing one alone', async () => {
    const { api, state } = await start();
    state.endpoints['br-dev-1'] = [];
    const first = await runNode(script, ['--branch', 'dev'], {
      ...envFor(api, { NEON_ENDPOINT_POLL_MS: '1' }),
      ...google,
    });
    assert.equal(first.code, 0, first.all);
    const created = api.requests.filter(
      (r) => r.method === 'POST' && r.path === '/api/v2/projects/proj-1/endpoints',
    );
    assert.equal(created.length, 1);
    assert.deepEqual(created[0].body.endpoint, {
      branch_id: 'br-dev-1',
      type: 'read_write',
    });
    assert.match(first.stdout, /created a read-write compute endpoint/);
    // Auth is enabled only after the endpoint exists.
    const order = api.requests.map((r) => `${r.method} ${r.path}`);
    assert.ok(
      order.indexOf('POST /api/v2/projects/proj-1/endpoints') <
        order.indexOf('POST /api/v2/projects/proj-1/branches/br-dev-1/auth'),
    );

    const again = await runNode(script, ['--branch', 'dev'], envFor(api, google));
    api.close();
    assert.equal(again.code, 0, again.all);
    assert.equal(
      api.requests.filter(
        (r) => r.method === 'POST' && r.path.endsWith('/projects/proj-1/endpoints'),
      ).length,
      1,
    );
    noSecrets(first);
  });

  it('--dry-run sends nothing, needs no keys and redacts secrets', async () => {
    const api = await mock(() => [500, {}]);
    const result = await runNode(script, ['--branch', 'main', '--dry-run'], {
      BREVO_SMTP_KEY: smtpKey,
      SENDER_EMAIL: 'hello@example.eu',
      PROD_WEB_URL: 'https://stamina-web.pages.dev',
      NEON_API_BASE: `${api.url}/api/v2`,
      ...google,
    });
    api.close();
    assert.equal(result.code, 0, result.all);
    assert.equal(api.requests.length, 0);
    assert.match(result.stdout, /POST .*\/auth\/domains/);
    assert.match(result.stdout, /"domain":"https:\/\/stamina-web\.pages\.dev"/);
    assert.match(result.stdout, /"host":"smtp-relay\.brevo\.com","port":587/);
    assert.match(result.stdout, /"allow_localhost":false/);
    assert.match(result.stdout, /"client_secret":"<redacted>"/);
    noSecrets(result);
  });

  it('configures the dev branch, then reports everything up to date', async () => {
    const { api, state } = await start();
    const first = await runNode(script, [], envFor(api, google));
    const second = await runNode(script, [], envFor(api, google));
    api.close();
    assert.equal(first.code, 0, first.all);
    assert.match(first.stdout, /enabled just now/);
    assert.match(second.stdout, /already enabled/);
    assert.equal(sent(api, 'POST', '/br-dev-1/auth').length, 1, 'Auth is enabled once');
    const a = state.auth['br-dev-1'];
    assert.deepEqual(a.patches.email_and_password, { enabled: true });
    assert.deepEqual(a.patches.allow_localhost, { allow_localhost: true });
    assert.deepEqual(a.patches.email_provider, {
      type: 'standard',
      host: 'smtp-relay.brevo.com',
      port: 587,
      username: 'login@smtp-brevo.com',
      password: smtpKey,
      sender_email: 'hello@example.eu',
      sender_name: 'Stamina',
    });
    assert.deepEqual(a.patches['oauth_providers/google'], {
      client_id: 'client-123',
      client_secret: googleSecret,
    });
    assert.equal(
      sent(api, 'POST', '/oauth_providers').length,
      0,
      'the shared Google entry is patched',
    );
    assert.match(first.stdout, new RegExp(`NEON_AUTH_BASE_URL\\s+${baseUrl}/br-dev-1`));
    assert.match(first.stdout, new RegExp(`redirect URI\\s+${baseUrl}/br-dev-1/callback/google`));
    for (const r of api.requests) assert.equal(r.headers.authorization, `Bearer ${apiKey}`);
    noSecrets(first);
    noSecrets(second);
  });

  it('trusts the web origins once, blocks localhost and adds Google when it is not listed', async () => {
    const { api, state } = await start();
    state.auth['br-main-1'] = {
      info: { base_url: `${baseUrl}/br-main-1` },
      domains: [{ domain: 'https://stamina-web.pages.dev/' }],
      providers: [],
      patches: {},
    };
    const env = envFor(api, {
      ...google,
      WEB_ORIGINS: 'https://stamina-web.pages.dev, https://www.example.eu',
    });
    const first = await runNode(script, ['--branch', 'main'], env);
    const second = await runNode(script, ['--branch', 'main'], env);
    api.close();
    assert.equal(first.code, 0, first.all);
    const posted = sent(api, 'POST', '/auth/domains').map((r) => r.body.domain);
    assert.deepEqual(posted, ['https://www.example.eu'], 'present domains are not added again');
    assert.deepEqual(state.auth['br-main-1'].patches.allow_localhost, { allow_localhost: false });
    assert.equal(sent(api, 'POST', '/oauth_providers').length, 1);
    assert.match(first.stdout, /gh variable set NEON_AUTH_BASE_URL --body '.*\/br-main-1'/);
    assert.match(second.stdout, /trusted domain present\s+https:\/\/www\.example\.eu/);
  });

  it('skips Google with a clear note when no client is configured', async () => {
    const { api, state } = await start();
    const result = await runNode(script, [], envFor(api));
    api.close();
    assert.equal(result.code, 0, result.all);
    assert.match(result.stdout, /Google OAuth\s+skipped: GOOGLE_OAUTH_CLIENT_ID/);
    assert.equal(state.auth['br-dev-1'].patches['oauth_providers/google'], undefined);
    assert.equal(sent(api, 'GET', '/oauth_providers').length, 0);
  });

  it('falls back to reading the integration when enabling says it is already enabled', async () => {
    let gets = 0;
    const api = await mock((req, url) => {
      const path = url.pathname.slice('/api/v2'.length);
      if (path === '/projects/proj-1/branches/br-dev-1')
        return [200, { branch: { id: 'br-dev-1', name: 'dev' } }];
      if (path.endsWith('/auth') && req.method === 'GET')
        return ++gets === 1 ? [404, {}] : [200, { base_url: baseUrl }];
      if (path.endsWith('/auth') && req.method === 'POST')
        return [400, { message: 'Auth already enabled for this branch' }];
      if (path.endsWith('/auth/domains') && req.method === 'GET') return [200, { domains: [] }];
      return [200, {}];
    });
    const result = await runNode(script, ['--branch', 'br-dev-1'], envFor(api));
    api.close();
    assert.equal(result.code, 0, result.all);
    assert.match(result.stdout, /already enabled/);
  });

  it('--preview only enables Auth, trusts the origin and writes base_url to GITHUB_OUTPUT', async () => {
    const { api, state } = await start();
    state.auth['br-pr-7'] = {
      info: { base_url: `${baseUrl}/br-pr-7` },
      domains: [],
      providers: [],
      patches: {},
    };
    const outputFile = join(mkdtempSync(join(tmpdir(), 'neon-auth-')), 'output');
    writeFileSync(outputFile, '');
    const result = await runNode(
      script,
      ['--preview', '--branch', 'br-pr-7', '--web-origin', 'https://pr-7.stamina-web.pages.dev'],
      {
        NEON_API_KEY: apiKey,
        NEON_PROJECT_ID: 'proj-1',
        NEON_API_BASE: `${api.url}/api/v2`,
        GITHUB_OUTPUT: outputFile,
      },
    );
    api.close();
    assert.equal(result.code, 0, result.all);
    assert.equal(readFileSync(outputFile, 'utf-8'), `base_url=${baseUrl}/br-pr-7\n`);
    assert.deepEqual(
      sent(api, 'POST', '/auth/domains').map((r) => r.body.domain),
      ['https://pr-7.stamina-web.pages.dev'],
    );
    assert.equal(
      api.requests.filter((r) => r.method === 'PATCH').length,
      0,
      'inherited settings are untouched',
    );
    noSecrets(result);
  });

  it('rejects bad arguments and configuration before sending anything', async () => {
    const api = await mock(() => [500, {}]);
    const env = envFor(api);
    const bad = [
      [['--bogus'], env],
      [['--branch'], env],
      [['--preview', '--branch', 'br-pr-7'], env],
      [['--branch', 'main'], env], // production needs a web origin
      [['--branch', 'main', '--web-origin', 'http://stamina-web.pages.dev'], env],
      [['--branch', 'main', '--web-origin', 'https://stamina-web.pages.dev/app'], env],
      [['--branch', 'main', '--web-origin', 'https://*.pages.dev'], env],
      [['--dry-run'], { ...env, SENDER_EMAIL: 'nope' }],
      [[], { ...env, BREVO_SMTP_KEY: '' }],
      [[], { ...env, GOOGLE_OAUTH_CLIENT_ID: 'only-the-id' }],
    ];
    for (const [args, e] of bad) {
      const result = await runNode(script, args, e);
      assert.equal(result.code, 2, `${args.join(' ')}: ${result.all}`);
    }
    api.close();
    assert.equal(api.requests.length, 0);
  });

  it('fails clearly when the branch does not exist or Neon rejects the key', async () => {
    const { api } = await start();
    const missing = await runNode(
      script,
      ['--branch', 'nope', '--web-origin', 'https://a.example.eu'],
      envFor(api),
    );
    assert.equal(missing.code, 1);
    assert.match(
      missing.stderr,
      /no branch named "nope" in the project \(found: dev, main, preview\/pr-7\)/,
    );
    api.close();
    const rejected = await mock(() => [401, { code: 'UNAUTHORIZED', message: 'bad key' }]);
    const denied = await runNode(script, [], envFor(rejected));
    rejected.close();
    assert.equal(denied.code, 1);
    assert.match(denied.stderr, /listing branches failed: HTTP 401/);
    noSecrets(denied);
  });
});

describe('deno-deploy.mjs', () => {
  // The script reads ../apps/api/dist/server.js relative to itself, so it runs from a scratch tree.
  const tree = mkdtempSync(join(tmpdir(), 'deno-deploy-'));
  mkdirSync(join(tree, 'scripts'));
  mkdirSync(join(tree, 'apps/api/dist'), { recursive: true });
  cpSync(join(root, 'scripts/deno-deploy.mjs'), join(tree, 'scripts/deno-deploy.mjs'));
  writeFileSync(join(tree, 'apps/api/dist/server.js'), 'export default {};');
  const script = join(tree, 'scripts/deno-deploy.mjs');
  const authUrl = 'https://ep-test.neonauth.eu-central-1.aws.neon.tech/neondb/auth';
  const env = {
    DENO_DEPLOY_TOKEN: 'deno-secret-token-789',
    DENO_APP: 'stamina-api',
    DATABASE_URL: 'postgres://user:db-secret@host/db',
    CORS_ORIGINS: 'https://stamina-web.pages.dev',
    NEON_AUTH_BASE_URL: authUrl,
  };

  for (const mode of ['preview', 'production']) {
    it(`${mode} --dry-run lists NEON_AUTH_BASE_URL with its value redacted`, async () => {
      const result = await runNode(script, [mode, '--dry-run'], env);
      assert.equal(result.code, 0, result.all);
      const sent = JSON.parse(
        result.stdout.slice(result.stdout.indexOf('{'), result.stdout.lastIndexOf('}') + 1),
      );
      assert.deepEqual(
        sent.env_vars.map((v) => v.key),
        ['DATABASE_URL', 'CORS_ORIGINS', 'NEON_AUTH_BASE_URL'],
      );
      for (const secret of [authUrl, 'db-secret', env.DENO_DEPLOY_TOKEN]) {
        assert.ok(!result.all.includes(secret), `leaked ${secret}`);
      }
    });
  }

  it('refuses to deploy a revision without NEON_AUTH_BASE_URL', async () => {
    const result = await runNode(script, ['production', '--dry-run'], {
      ...env,
      NEON_AUTH_BASE_URL: '',
    });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /NEON_AUTH_BASE_URL is required/);
  });
});

describe('infra/bootstrap.sh', () => {
  const token = 'cf-secret-token-000';
  const handler = (req, url, body, state) => {
    const path = '/accounts/acc123/r2/buckets';
    if (req.method === 'GET' && url.pathname === `${path}/stamina-tfstate`) {
      return state.created
        ? [200, { success: true }]
        : [404, { success: false, errors: [{ code: 10006 }] }];
    }
    if (req.method === 'POST' && url.pathname === path) {
      state.created = true;
      return [200, { success: true }];
    }
    return [500, {}];
  };

  it('creates the state bucket in the EU jurisdiction once', async () => {
    const api = await mock(handler);
    const env = {
      TOFU_CLOUDFLARE_API_TOKEN: token,
      CLOUDFLARE_ACCOUNT_ID: 'acc123',
      CLOUDFLARE_API_BASE: api.url,
    };
    const first = await run('infra/bootstrap.sh', [], env);
    const second = await run('infra/bootstrap.sh', [], env);
    api.close();
    assert.equal(first.code, 0, first.all);
    assert.match(first.stdout, /created bucket stamina-tfstate in the eu jurisdiction/);
    assert.equal(second.code, 0, second.all);
    assert.match(second.stdout, /already exists/);
    assert.equal(api.count('POST'), 1);
    const post = api.requests.find((r) => r.method === 'POST');
    assert.deepEqual(post.body, { name: 'stamina-tfstate' });
    for (const r of api.requests) {
      assert.equal(r.headers['cf-r2-jurisdiction'], 'eu');
      assert.equal(r.headers.authorization, `Bearer ${token}`);
    }
    assert.ok(!first.all.includes(token) && !second.all.includes(token));
  });

  it('fails when the API answers with an error', async () => {
    const api = await mock(() => [403, { success: false }]);
    const result = await run('infra/bootstrap.sh', [], {
      TOFU_CLOUDFLARE_API_TOKEN: token,
      CLOUDFLARE_ACCOUNT_ID: 'acc123',
      CLOUDFLARE_API_BASE: api.url,
    });
    api.close();
    assert.equal(result.code, 1);
    assert.match(result.stderr, /HTTP 403/);
  });
});

describe('infra/tofu.sh', () => {
  it('names every missing variable and refuses to run', async () => {
    const result = await run('infra/tofu.sh', ['production', 'version'], {});
    assert.equal(result.code, 1);
    assert.match(
      result.stderr,
      /missing environment variables: TOFU_CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID/,
    );
  });

  it('rejects an unknown environment and missing arguments', async () => {
    assert.equal((await run('infra/tofu.sh', ['nowhere', 'plan'], {})).code, 2);
    assert.equal((await run('infra/tofu.sh', ['production'], {})).code, 2);
  });
});
