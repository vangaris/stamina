import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import { HttpHeader } from '../src/enums/http-header.ts';
import { RouteLabel } from '../src/enums/route-label.ts';
import { expectNoSentinel, SENTINELS } from './support/sentinel.ts';
import { startTestApi } from './support/test-api.ts';

const ALLOWED_KEYS = ['request_id', 'route', 'status', 'latency_ms', 'user_id', 'error_type'];
const REQUIRED_KEYS = ['request_id', 'route', 'status', 'latency_ms'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

class PlanGenerationError extends Error {}

describe('request logging', () => {
  let api: Awaited<ReturnType<typeof startTestApi>>;
  const lines: string[] = [];
  const consoleOutput: unknown[][] = [];

  const sensitiveInit = (method: string, extra: Record<string, string> = {}): RequestInit => ({
    method,
    headers: {
      'content-type': 'application/json',
      'x-health-note': SENTINELS.header,
      cookie: `profile=${SENTINELS.cookie}`,
      authorization: `Bearer ${SENTINELS.header}`,
      ...extra,
    },
    body: JSON.stringify({ condition: SENTINELS.body }),
  });

  beforeAll(async () => {
    for (const method of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, method).mockImplementation((...args) => void consoleOutput.push(args));
    }
    api = await startTestApi({ log: (line) => lines.push(line) });
    api.app.post('/notes/:note', (c) => c.json({ ok: true }));
    api.app.post('/boom/:note', () => {
      throw new PlanGenerationError(`failed for ${SENTINELS.error}`);
    });
    api.app.get('/whoami', (c) => {
      c.set('userId', 'u_7f3a');
      return c.json({ ok: true });
    });
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await api.close();
  });

  const records = () => lines.map((line) => JSON.parse(line) as Record<string, unknown>);

  it('never lets request bodies, queries, headers, params or error messages reach the logs', async () => {
    const responses = [
      await fetch(`${api.baseUrl}/health?q=${SENTINELS.query}`, sensitiveInit('POST')),
      await fetch(
        `${api.baseUrl}/notes/${SENTINELS.param}?q=${SENTINELS.query}`,
        sensitiveInit('POST'),
      ),
      await fetch(
        `${api.baseUrl}/boom/${SENTINELS.param}?q=${SENTINELS.query}`,
        sensitiveInit('POST'),
      ),
      await fetch(
        `${api.baseUrl}/nowhere/${SENTINELS.path}?q=${SENTINELS.query}`,
        sensitiveInit('PUT'),
      ),
    ];

    expect(responses.map((r) => r.status)).toEqual([404, 200, 500, 404]);
    const failure = await responses[2]!.text();
    expect(JSON.parse(failure)).toEqual({ error: ApiErrorCode.InternalError });

    const logged = records();
    expect(logged).toHaveLength(4);
    for (const record of logged) {
      expect(Object.keys(record).filter((k) => !ALLOWED_KEYS.includes(k))).toEqual([]);
      expect(Object.keys(record)).toEqual(expect.arrayContaining(REQUIRED_KEYS));
      expect(record.request_id).toMatch(UUID);
      expect(record.latency_ms).toEqual(expect.any(Number));
    }

    expect(logged.map((r) => [r.route, r.status, r.error_type])).toEqual([
      [RouteLabel.Unmatched, 404, undefined], // POST /health is not a route
      ['/notes/:note', 200, undefined],
      ['/boom/:note', 500, 'PlanGenerationError'],
      [RouteLabel.Unmatched, 404, undefined],
    ]);

    expectNoSentinel(lines);
    expectNoSentinel(consoleOutput);
    expectNoSentinel(await Promise.all(responses.map((r) => r.headers.get(HttpHeader.RequestId))));
  });

  it('logs a successful health check with route, status and latency only', async () => {
    lines.length = 0;
    const response = await fetch(`${api.baseUrl}/health`);

    expect(response.status).toBe(200);
    const [record] = records();
    expect(Object.keys(record!).sort()).toEqual(['latency_ms', 'request_id', 'route', 'status']);
    expect(record).toMatchObject({ route: '/health', status: 200 });
  });

  it('echoes a UUID request ID and replaces anything else', async () => {
    lines.length = 0;
    const inbound = '3f2b8c1e-5d7a-4e0b-9c64-0a1b2c3d4e5f';

    const kept = await fetch(`${api.baseUrl}/health`, {
      headers: { [HttpHeader.RequestId]: inbound },
    });
    const replaced = await fetch(`${api.baseUrl}/health`, {
      headers: { [HttpHeader.RequestId]: SENTINELS.requestId },
    });

    expect(kept.headers.get(HttpHeader.RequestId)).toBe(inbound);
    expect(replaced.headers.get(HttpHeader.RequestId)).toMatch(UUID);
    expect(records().map((r) => r.request_id)).toEqual([
      inbound,
      replaced.headers.get(HttpHeader.RequestId),
    ]);
    expectNoSentinel(lines);
  });

  it('includes the pseudonymous user ID only when a handler set one', async () => {
    lines.length = 0;

    await fetch(`${api.baseUrl}/whoami`);
    await fetch(`${api.baseUrl}/health`);

    const [withUser, withoutUser] = records();
    expect(withUser).toMatchObject({ route: '/whoami', user_id: 'u_7f3a' });
    expect(withoutUser).not.toHaveProperty('user_id');
  });

  it('puts the request ID on error responses too', async () => {
    const response = await fetch(`${api.baseUrl}/boom/x`, { method: 'POST' });

    expect(response.status).toBe(500);
    expect(response.headers.get(HttpHeader.RequestId)).toMatch(UUID);
  });
});
