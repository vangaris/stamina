import { describe, expect, it } from 'vitest';
import { SWAP_STORAGE_PREFIX } from '../config.ts';
import type { SwapStorage } from '../types.ts';
import { createSwapStore } from './create-swap-store.ts';

function memoryStorage(
  initial: Record<string, string> = {},
): SwapStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

const blocked: SwapStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

describe('createSwapStore', () => {
  it('keeps a Session swaps for the next read, apart from other Sessions', () => {
    const storage = memoryStorage();
    const store = createSwapStore(storage);

    store.write('s1', { a: 'box-squat' });

    expect(createSwapStore(storage).read('s1')).toEqual({ a: 'box-squat' });
    expect(store.read('s2')).toEqual({});
  });

  it('forgets the swaps when cleared, and stores nothing for none', () => {
    const storage = memoryStorage();
    const store = createSwapStore(storage);
    store.write('s1', { a: 'box-squat' });

    store.clear('s1');
    expect(store.read('s1')).toEqual({});

    store.write('s1', {});
    expect(storage.data.size).toBe(0);
  });

  it('reads nothing usable as no swaps', () => {
    for (const stored of ['not json', '[1]', 'null', '7']) {
      const store = createSwapStore(memoryStorage({ [`${SWAP_STORAGE_PREFIX}s1`]: stored }));
      expect(store.read('s1')).toEqual({});
    }
  });

  it('drops entries that are not exercise ids', () => {
    const store = createSwapStore(
      memoryStorage({ [`${SWAP_STORAGE_PREFIX}s1`]: JSON.stringify({ a: 'box-squat', b: 3 }) }),
    );

    expect(store.read('s1')).toEqual({ a: 'box-squat' });
  });

  it('copes with storage that refuses', () => {
    const store = createSwapStore(blocked);

    expect(store.read('s1')).toEqual({});
    expect(() => store.write('s1', { a: 'b' })).not.toThrow();
    expect(() => store.clear('s1')).not.toThrow();
  });
});
