import type { Envelope, Event, Transport } from '@sentry/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';
import { HttpHeader } from '../src/enums/http-header.ts';
import { SentryEnvironment } from '../src/enums/sentry-environment.ts';
import { createErrorReporter } from '../src/error-reporter.ts';
import { expectNoSentinel, SENTINELS } from './support/sentinel.ts';
import { startTestApi } from './support/test-api.ts';

const EU_DSN = 'https://publickey@o1.ingest.de.sentry.io/1';

class PlanGenerationError extends Error {
  override name = 'PlanGenerationError';
}

/** An error event carries exception, tags and metadata; envelope items are `[header, payload]`. */
function eventsIn(envelopes: Envelope[]): Event[] {
  return envelopes.flatMap(([, items]) =>
    items.filter(([header]) => header.type === 'event').map(([, payload]) => payload as Event),
  );
}

describe('error reporting', () => {
  let api: Awaited<ReturnType<typeof startTestApi>>;
  const envelopes: Envelope[] = [];

  beforeAll(async () => {
    const transport = (): Transport => ({
      send: async (envelope) => {
        envelopes.push(envelope);
        return {};
      },
      flush: async () => true,
    });
    api = await startTestApi({
      errorReporter: createErrorReporter({ dsn: EU_DSN, environment: 'test', transport }),
    });
    api.app.post('/boom/:note', () => {
      throw new PlanGenerationError(`failed for ${SENTINELS.error}`);
    });
  });
  afterAll(() => api.close());

  it('reports an unexpected error with its type and stack but none of the user data', async () => {
    const response = await fetch(`${api.baseUrl}/boom/${SENTINELS.param}?q=${SENTINELS.query}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-health-note': SENTINELS.header,
        cookie: `profile=${SENTINELS.cookie}`,
      },
      body: JSON.stringify({ condition: SENTINELS.body }),
    });

    expect(response.status).toBe(500);
    const [event, ...rest] = eventsIn(envelopes);
    expect(rest).toEqual([]);

    expect(event!.exception!.values!).toHaveLength(1);
    expect(event!.exception!.values![0]).toMatchObject({ type: 'PlanGenerationError', value: '' });
    expect(event!.exception!.values![0]!.stacktrace!.frames!.length).toBeGreaterThan(0);
    expect(event!.tags).toEqual({ request_id: response.headers.get(HttpHeader.RequestId) });
    expect(event!.environment).toBe('test');
    for (const dropped of ['request', 'user', 'extra', 'breadcrumbs', 'message', 'contexts']) {
      expect(event).not.toHaveProperty(dropped);
    }

    expectNoSentinel(envelopes);
  });

  it('does not report client errors', async () => {
    const before = envelopes.length;

    const response = await fetch(`${api.baseUrl}/nowhere`);

    expect(response.status).toBe(404);
    expect(envelopes).toHaveLength(before);
  });
});

describe('Sentry configuration', () => {
  const base = { DATABASE_URL: 'postgres://x' };

  it('stays off when no DSN is set', () => {
    expect(loadConfig(base).sentry).toBeUndefined();
    expect(loadConfig({ ...base, SENTRY_DSN: '' }).sentry).toBeUndefined();
  });

  it('accepts an EU DSN and defaults the environment to production', () => {
    expect(loadConfig({ ...base, SENTRY_DSN: EU_DSN }).sentry).toEqual({
      dsn: EU_DSN,
      environment: SentryEnvironment.Production,
    });
  });

  it('rejects a DSN outside the EU region', () => {
    expect(() =>
      loadConfig({ ...base, SENTRY_DSN: 'https://key@o1.ingest.us.sentry.io/1' }),
    ).toThrow(/de\.sentry\.io/);
  });
});
