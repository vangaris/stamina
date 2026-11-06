import { ApiError } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { AppErrorCode } from '../enums/app-error-code.ts';
import { readThroughCache } from './read-through-cache.ts';

function setup(options: { online?: boolean; load?: () => Promise<string>; cached?: string } = {}) {
  const saved: string[] = [];
  const read = () =>
    readThroughCache({
      isOnline: () => options.online ?? true,
      load: options.load ?? (async () => 'fresh'),
      save: async (value) => void saved.push(value),
      cached: async () => options.cached,
    });
  return { saved, read };
}

describe('readThroughCache', () => {
  it('returns and remembers the fresh answer while online', async () => {
    const { saved, read } = setup({ cached: 'old' });

    expect(await read()).toBe('fresh');
    expect(saved).toEqual(['fresh']);
  });

  it('returns the remembered answer offline without fetching', async () => {
    let fetched = false;
    const { saved, read } = setup({
      online: false,
      cached: 'old',
      load: async () => {
        fetched = true;
        return 'fresh';
      },
    });

    expect(await read()).toBe('old');
    expect(fetched).toBe(false);
    expect(saved).toEqual([]);
  });

  it('falls back to the remembered answer when the fetch cannot reach the server', async () => {
    const { read } = setup({
      cached: 'old',
      load: async () => {
        throw new TypeError('Failed to fetch');
      },
    });

    expect(await read()).toBe('old');
  });

  it('rejects Offline when offline and nothing was remembered', async () => {
    await expect(setup({ online: false }).read()).rejects.toMatchObject({
      code: AppErrorCode.Offline,
    });
  });

  it('rejects as it is when the server answered with an error, even with a remembered answer', async () => {
    const failure = new ApiError(404);
    const { read } = setup({
      cached: 'old',
      load: async () => {
        throw failure;
      },
    });

    await expect(read()).rejects.toBe(failure);
  });
});
