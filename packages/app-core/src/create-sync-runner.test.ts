import { ApiError } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createServices } from './create-services.ts';
import { createSyncRunner } from './create-sync-runner.ts';
import { defineRequest } from './define-request.ts';
import { OfflinePolicy } from './enums/offline-policy.ts';
import { ServicesMode } from './enums/services-mode.ts';
import type { Request, Services } from './types.ts';

enum TestRequestType {
  Note = 'Note',
  Retired = 'Retired',
}

interface Note extends Request<void> {
  readonly type: TestRequestType.Note;
  readonly text: string;
}

function setup(failOn?: string, failWith: () => unknown = () => new Error('boom')) {
  const services: Services = createServices({ mode: ServicesMode.Test });
  const handled: string[] = [];
  const sync = createSyncRunner({
    services,
    stores: {},
    registry: {
      [TestRequestType.Note]: defineRequest<Note, Services, object>({
        schema: z.object({ type: z.literal(TestRequestType.Note), text: z.string().min(1) }),
        offline: OfflinePolicy.Queue,
        handler: async ({ text }) => {
          if (text === failOn) throw failWith();
          handled.push(text);
        },
      }),
    },
  });
  const queue = async (...requests: Request[]) => {
    for (const request of requests) await services.offlineQueue.enqueue(request);
  };
  const note = (text: string): Note => ({ type: TestRequestType.Note, text });
  const remaining = async () =>
    (await services.offlineQueue.pending()).map(({ request }) => (request as Note).text);
  return { sync, queue, note, handled, remaining };
}

describe('createSyncRunner', () => {
  it('replays each entry through its handler in order and empties the queue', async () => {
    const { sync, queue, note, handled, remaining } = setup();
    await queue(note('a'), note('b'));

    expect(await sync()).toEqual({ replayed: 2, remaining: 0 });
    expect(handled).toEqual(['a', 'b']);
    expect(await remaining()).toEqual([]);
  });

  it('stops at a failing entry and keeps it and everything after it', async () => {
    const { sync, queue, note, handled, remaining } = setup('b');
    await queue(note('a'), note('b'), note('c'));

    expect(await sync()).toEqual({ replayed: 1, remaining: 2 });
    expect(handled).toEqual(['a']);
    expect(await remaining()).toEqual(['b', 'c']);
  });

  it.each([400, 404, 409, 422])(
    'drops an entry the server answers %i to, and goes on with the next one',
    async (status) => {
      const { sync, queue, note, handled, remaining } = setup('b', () => new ApiError(status));
      await queue(note('a'), note('b'), note('c'));

      expect(await sync()).toEqual({ replayed: 3, remaining: 0 });
      expect(handled).toEqual(['a', 'c']);
      expect(await remaining()).toEqual([]);
    },
  );

  it.each([
    ['401', () => new ApiError(401)],
    ['408', () => new ApiError(408)],
    ['429', () => new ApiError(429)],
    ['500', () => new ApiError(500)],
    ['503', () => new ApiError(503)],
    ['a network failure', () => new TypeError('Failed to fetch')],
    ['an unknown error', () => new Error('boom')],
  ])('keeps an entry that failed with %s and stops the run', async (_name, failWith) => {
    const { sync, queue, note, handled, remaining } = setup('b', failWith);
    await queue(note('a'), note('b'), note('c'));

    expect(await sync()).toEqual({ replayed: 1, remaining: 2 });
    expect(handled).toEqual(['a']);
    expect(await remaining()).toEqual(['b', 'c']);
  });

  it('drops an entry that no longer parses, or whose type has no handler, and goes on', async () => {
    const { sync, queue, note, handled, remaining } = setup();
    await queue(note(''), { type: TestRequestType.Retired }, note('after'));

    expect(await sync()).toEqual({ replayed: 3, remaining: 0 });
    expect(handled).toEqual(['after']);
    expect(await remaining()).toEqual([]);
  });

  it('replays entries queued while it was running', async () => {
    const services: Services = createServices({ mode: ServicesMode.Test });
    const handled: string[] = [];
    const first: Note = { type: TestRequestType.Note, text: 'first' };
    const late: Note = { type: TestRequestType.Note, text: 'late' };
    const sync = createSyncRunner({
      services,
      stores: {},
      registry: {
        [TestRequestType.Note]: defineRequest<Note, Services, object>({
          schema: z.object({ type: z.literal(TestRequestType.Note), text: z.string() }),
          offline: OfflinePolicy.Queue,
          handler: async ({ text }) => {
            handled.push(text);
            if (text === 'first') await services.offlineQueue.enqueue(late);
          },
        }),
      },
    });
    await services.offlineQueue.enqueue(first);

    expect(await sync()).toEqual({ replayed: 2, remaining: 0 });
    expect(handled).toEqual(['first', 'late']);
  });
});
