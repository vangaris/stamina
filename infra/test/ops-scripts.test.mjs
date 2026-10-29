// Offline tests for the setup scripts OpenTofu cannot replace: infra/bootstrap.sh and
// scripts/ops/{uptimerobot,brevo,deno}-setup.sh. Each script runs for real against a mock HTTP
// server started here, so argument handling, find-or-create idempotency and secret hygiene are
// exercised without any vendor account.
//
//   node --test infra/test/ops-scripts.test.mjs
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
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

/** Runs a script with a clean environment (no .env, no inherited secrets). */
function run(script, args, env) {
  return new Promise((resolve) => {
    execFile(
      'bash',
      [join(root, script), ...args],
      { env: { PATH: process.env.PATH, HOME: process.env.HOME, ENV_FILE: '/nonexistent', ...env } },
      (error, stdout, stderr) =>
        resolve({ code: error ? error.code : 0, stdout, stderr, all: stdout + stderr }),
    );
  });
}

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
