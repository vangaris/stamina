import { describe, expect, it } from 'vitest';
import { scrubEvent } from './scrub-event.ts';

const errorEvent = () => ({
  event_id: 'abc',
  timestamp: 1,
  platform: 'javascript',
  level: 'error',
  release: 'r1',
  environment: 'test',
  sdk: { name: 'sentry' },
  user: { id: 'u1', email: 'a@b.c' },
  request: { url: 'https://x.example/?weight=80', headers: { cookie: 'secret' } },
  contexts: { state: { pain: 7 } },
  extra: { note: 'knee hurts' },
  breadcrumbs: [{ message: 'typed 80' }],
  tags: { request_id: 'r-1', route: '/profile', userId: 'u1' },
  exception: {
    values: [
      {
        type: 'TypeError',
        value: 'weight 80 is invalid',
        stacktrace: { frames: [{ function: 'save', filename: '/a.js?x=1', vars: { w: 80 } }] },
      },
    ],
  },
});

describe('scrubEvent', () => {
  it('rebuilds the event from allowlisted fields only', () => {
    expect(scrubEvent(errorEvent())).toEqual({
      event_id: 'abc',
      timestamp: 1,
      platform: 'javascript',
      level: 'error',
      release: 'r1',
      environment: 'test',
      sdk: { name: 'sentry' },
      tags: { request_id: 'r-1' },
      exception: {
        values: [
          {
            type: 'TypeError',
            value: '',
            stacktrace: { frames: [{ function: 'save', filename: '/a.js' }] },
          },
        ],
      },
    });
  });

  it('leaves no user data anywhere in the serialized event', () => {
    const json = JSON.stringify(scrubEvent(errorEvent()));

    for (const secret of ['80', 'knee', 'a@b.c', 'cookie', 'pain', 'typed', 'u1', '/profile']) {
      expect(json).not.toContain(secret);
    }
  });

  it('omits tags when no allowlisted tag is present', () => {
    const event = { ...errorEvent(), tags: { route: '/profile' } };

    expect(scrubEvent(event)).not.toHaveProperty('tags');
  });

  it('drops events that are not error events', () => {
    expect(scrubEvent({ type: 'transaction', exception: { values: [{}] } })).toBeNull();
    expect(scrubEvent({ message: 'hello weight 80' })).toBeNull();
    expect(scrubEvent({ exception: {} })).toBeNull();
    expect(scrubEvent({ exception: { values: 'x' } })).toBeNull();
  });

  it('drops exception entries that are not objects', () => {
    const result = scrubEvent({ exception: { values: [null, { type: 'E' }] } });

    expect(result).toEqual({ exception: { values: [{ type: 'E', value: '' }] } });
  });
});
