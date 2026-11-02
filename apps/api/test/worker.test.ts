import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiErrorCode } from '../src/enums/api-error-code.ts';
import worker from '../src/worker.ts';

const SECRET = 'postgres://owner:hunter2-secret@db.example/neondb';

describe('Worker entry with invalid bindings', () => {
  afterEach(() => vi.restoreAllMocks());

  it('answers 500 without detail and names only the broken settings in its log', async () => {
    const logged: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((line: string) => {
      logged.push(line);
    });
    const background = { waitUntil: vi.fn() };

    const response = await worker.fetch(
      new Request('https://api.test/health'),
      { DATABASE_URL: SECRET, NEON_AUTH_BASE_URL: 'not a url' },
      background,
    );
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(JSON.parse(body)).toEqual({ error: ApiErrorCode.InternalError });
    expect(JSON.parse(logged[0]!)).toEqual({
      error_type: 'ConfigError',
      settings: ['NEON_AUTH_BASE_URL'],
    });
    expect(`${body}${logged.join('')}`).not.toContain('hunter2');
    expect(background.waitUntil).not.toHaveBeenCalled();
  });
});
