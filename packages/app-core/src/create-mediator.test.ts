import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { QUEUED_RESULT } from './config.ts';
import { createMediator } from './create-mediator.ts';
import { createServices } from './create-services.ts';
import { defineRequest } from './define-request.ts';
import { AppErrorCode } from './enums/app-error-code.ts';
import { OfflinePolicy } from './enums/offline-policy.ts';
import { RequestOutcome } from './enums/request-outcome.ts';
import { ServicesMode } from './enums/services-mode.ts';
import { AppError } from './errors/app-error.ts';
import type { LogEntry, Request, Services } from './types.ts';

enum TestRequestType {
  Echo = 'Echo',
  Missing = 'Missing',
  Boom = 'Boom',
}

interface Echo extends Request<string> {
  readonly type: TestRequestType.Echo;
  readonly text: string;
}

const stores = { name: 'stores' };
type TestStores = typeof stores;

const echo = (offline: OfflinePolicy) =>
  defineRequest<Echo, Services, TestStores>({
    schema: z.object({ type: z.literal(TestRequestType.Echo), text: z.string().trim().min(1) }),
    offline,
    handler: async (request, context) => `${request.text}:${context.stores.name}`,
  });

function setup(overrides: Partial<Services> = {}, offline = OfflinePolicy.Never) {
  const services: Services = { ...createServices({ mode: ServicesMode.Test }), ...overrides };
  const mediator = createMediator({
    services,
    stores,
    registry: {
      [TestRequestType.Echo]: echo(offline),
      [TestRequestType.Boom]: defineRequest<Request, Services, TestStores>({
        schema: z.object({ type: z.literal(TestRequestType.Boom) }),
        offline,
        handler: async () => {
          throw new Error('secret@example.com');
        },
      }),
    },
  });
  return { mediator, services };
}

describe('createMediator', () => {
  it('routes a request to the handler registered for its type, with the stores', async () => {
    const { mediator } = setup();

    expect(await mediator.send<Echo>({ type: TestRequestType.Echo, text: 'hi' })).toBe('hi:stores');
  });

  it('hands the handler the request as its schema parsed it', async () => {
    const { mediator } = setup();

    expect(await mediator.send<Echo>({ type: TestRequestType.Echo, text: '  hi  ' })).toBe(
      'hi:stores',
    );
  });

  it('rejects a request whose type has no definition, naming the type', async () => {
    const { mediator } = setup();

    await expect(mediator.send({ type: TestRequestType.Missing })).rejects.toThrow(
      'No handler registered for "Missing"',
    );
  });

  it('maps an unknown failure to AppError(Unknown) without its message', async () => {
    const { mediator } = setup();

    const error = await mediator.send({ type: TestRequestType.Boom }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: AppErrorCode.Unknown, message: AppErrorCode.Unknown });
  });

  describe('offline policy', () => {
    const offline = { network: { isOnline: () => false } };

    it('rejects Never requests with Offline and never runs the handler', async () => {
      const { mediator, services } = setup(offline, OfflinePolicy.Never);

      await expect(
        mediator.send<Echo>({ type: TestRequestType.Echo, text: 'hi' }),
      ).rejects.toMatchObject({
        code: AppErrorCode.Offline,
      });
      expect(await services.offlineQueue.pending()).toEqual([]);
    });

    it('queues Queue requests and resolves the queued marker', async () => {
      const { mediator, services } = setup(offline, OfflinePolicy.Queue);
      const request: Echo = { type: TestRequestType.Echo, text: 'hi' };

      expect(await mediator.send(request)).toBe(QUEUED_RESULT);
      expect(await services.offlineQueue.pending()).toEqual([request]);
    });

    it('runs Always requests anyway', async () => {
      const { mediator } = setup(offline, OfflinePolicy.Always);

      expect(await mediator.send<Echo>({ type: TestRequestType.Echo, text: 'hi' })).toBe(
        'hi:stores',
      );
    });

    it('does not queue while online', async () => {
      const { mediator, services } = setup({}, OfflinePolicy.Queue);

      expect(await mediator.send<Echo>({ type: TestRequestType.Echo, text: 'hi' })).toBe(
        'hi:stores',
      );
      expect(await services.offlineQueue.pending()).toEqual([]);
    });
  });

  describe('log-safe and timing', () => {
    function withLog() {
      const lines: LogEntry[] = [];
      const ticks = [100, 142];
      const overrides: Partial<Services> = {
        logger: { log: (entry) => lines.push(entry) },
        clock: { now: () => ticks.shift() ?? 142 },
      };
      return { lines, overrides };
    }

    it('logs type, outcome and the clock duration, and nothing else', async () => {
      const { lines, overrides } = withLog();
      const { mediator } = setup(overrides);

      await mediator.send<Echo>({ type: TestRequestType.Echo, text: 'private' });

      expect(lines).toEqual([
        { requestType: TestRequestType.Echo, outcome: RequestOutcome.Success, durationMs: 42 },
      ]);
    });

    it('logs failures, including validation failures, and queued requests', async () => {
      const { lines, overrides } = withLog();
      const { mediator } = setup(overrides);
      await mediator.send<Echo>({ type: TestRequestType.Echo, text: '   ' }).catch(() => undefined);

      const queued = withLog();
      const offline = setup(
        { ...queued.overrides, network: { isOnline: () => false } },
        OfflinePolicy.Queue,
      );
      await offline.mediator.send<Echo>({ type: TestRequestType.Echo, text: 'x' });

      expect(lines.map((line) => line.outcome)).toEqual([RequestOutcome.Failure]);
      expect(queued.lines.map((line) => line.outcome)).toEqual([RequestOutcome.Queued]);
    });

    it('maps a schema failure to ValidationFailed', async () => {
      const { mediator } = setup();

      await expect(
        mediator.send<Echo>({ type: TestRequestType.Echo, text: ' ' }),
      ).rejects.toMatchObject({
        code: AppErrorCode.ValidationFailed,
      });
    });
  });
});
