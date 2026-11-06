import { StopFlag } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { StopFlagStorageKey } from '../enums/stop-flag-storage-key.ts';
import { createMemoryStorage } from '../testing/create-memory-storage.ts';
import type { RecheckOwedStorage } from '../types.ts';
import { createRecheckOwedStore } from './create-recheck-owed-store.ts';

const blocked: RecheckOwedStorage = {
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

describe('createRecheckOwedStore', () => {
  it('owes nothing at first', () => {
    expect(createRecheckOwedStore(createMemoryStorage()).owed()).toEqual([]);
  });

  it('keeps what is owed for the next read, once for each flag', () => {
    const storage = createMemoryStorage();
    const store = createRecheckOwedStore(storage);

    store.owe(StopFlag.ChestPain);
    store.owe(StopFlag.HeadKnock);
    store.owe(StopFlag.ChestPain);

    expect(createRecheckOwedStore(storage).owed()).toEqual([
      StopFlag.ChestPain,
      StopFlag.HeadKnock,
    ]);
  });

  it('forgets a flag when it is settled, and stores nothing once none is owed', () => {
    const storage = createMemoryStorage();
    const store = createRecheckOwedStore(storage);
    store.owe(StopFlag.ChestPain);
    store.owe(StopFlag.Fainting);

    store.settle(StopFlag.ChestPain);
    expect(store.owed()).toEqual([StopFlag.Fainting]);

    store.settle(StopFlag.Fainting);
    expect(storage.data.size).toBe(0);
  });

  it('settles a flag that is not owed without a trace', () => {
    const storage = createMemoryStorage();

    createRecheckOwedStore(storage).settle(StopFlag.Fever);

    expect(storage.data.size).toBe(0);
  });

  it('reads nothing usable as nothing owed, and drops entries that are not stop flags', () => {
    for (const stored of ['not json', '{"a":1}', 'null', '7']) {
      const store = createRecheckOwedStore(
        createMemoryStorage({ [StopFlagStorageKey.RecheckOwed]: stored }),
      );
      expect(store.owed()).toEqual([]);
    }
    const mixed = createRecheckOwedStore(
      createMemoryStorage({
        [StopFlagStorageKey.RecheckOwed]: JSON.stringify([StopFlag.Fainting, 'migraine', 3]),
      }),
    );
    expect(mixed.owed()).toEqual([StopFlag.Fainting]);
  });

  it('copes with storage that refuses', () => {
    const store = createRecheckOwedStore(blocked);

    expect(store.owed()).toEqual([]);
    expect(() => store.owe(StopFlag.ChestPain)).not.toThrow();
    expect(() => store.settle(StopFlag.ChestPain)).not.toThrow();
  });
});
