import {
  createStackParser,
  createTransport,
  Scope,
  type BaseTransportOptions,
  type Transport,
} from '@sentry/core';
import { nodeStackLineParser, ServerRuntimeClient } from '@sentry/core/server';
import { noDataCollection, scrubBreadcrumb, scrubEvent } from '@stamina/safe-log';
import { ErrorMechanism } from './enums/error-mechanism.ts';

/** Sends unexpected server errors to an external tracker. Never throws. */
export interface ErrorReporter {
  report(error: unknown, context: { requestId: string }): Promise<void>;
}

export interface ErrorReporterOptions {
  /** Sentry EU DSN (`*.de.sentry.io`); validated by `loadConfig`. */
  dsn: string;
  environment: string;
  /** Replaces the HTTP transport; tests capture the outgoing envelope with it. */
  transport?: (options: BaseTransportOptions) => Transport;
}

const FLUSH_TIMEOUT_MS = 2000;

/** Plain `fetch` works on Node and on Cloudflare Workers, unlike the Node SDK's http-module transport. */
function fetchTransport(options: BaseTransportOptions): Transport {
  return createTransport(options, async (request) => {
    const response = await fetch(options.url, {
      method: 'POST',
      body: request.body,
      headers: options.headers ?? {},
    });
    return {
      statusCode: response.status,
      headers: {
        'x-sentry-rate-limits': response.headers.get('X-Sentry-Rate-Limits'),
        'retry-after': response.headers.get('Retry-After'),
      },
    };
  });
}

/**
 * Uses `@sentry/core` directly: `@sentry/node` depends on OpenTelemetry module patching that
 * neither a bundled Worker nor an edge runtime supports. Only exception type and stack frames leave
 * the process (see `@stamina/safe-log`).
 */
export function createErrorReporter(options: ErrorReporterOptions): ErrorReporter {
  const client = new ServerRuntimeClient({
    dsn: options.dsn,
    environment: options.environment,
    integrations: [],
    stackParser: createStackParser(nodeStackLineParser()),
    transport: options.transport ?? fetchTransport,
    dataCollection: noDataCollection,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
  client.init();

  return {
    async report(error, { requestId }) {
      try {
        const scope = new Scope();
        scope.setClient(client);
        scope.setTag('request_id', requestId);
        client.captureException(
          error,
          { mechanism: { type: ErrorMechanism.Hono, handled: false } },
          scope,
        );
        // A serverless isolate can be frozen right after the response, so wait for delivery.
        await client.flush(FLUSH_TIMEOUT_MS);
      } catch {
        // Reporting must never turn a 500 into something worse.
      }
    },
  };
}
