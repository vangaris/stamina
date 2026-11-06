import { newId } from '@stamina/ids';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { FAKE_AUTH } from '../config.ts';
import {
  deleteAccount,
  finishSession,
  getProgram,
  getSession,
  logSet,
  SessionStatus,
  signOut,
  verifyEmailCode,
} from '../index.ts';
import { createDexieLocalData } from '../services/create-dexie-local-data.ts';
import { createDexieOfflineQueue } from '../services/create-dexie-offline-queue.ts';
import { createDexiePlanCache } from '../services/create-dexie-plan-cache.ts';
import { createDexieSessionLog } from '../services/create-dexie-session-log.ts';
import { createLocalDatabase } from '../services/create-local-database.ts';
import { reloadSession } from '../testing/reload-session.ts';
import { setupSession } from '../testing/setup-session.ts';
import type { Services } from '../types.ts';

const OTHER_EMAIL = 'grace@example.com';

function dexieServices(indexedDB: IDBFactory): Partial<Services> {
  const database = createLocalDatabase({ indexedDB, IDBKeyRange });
  return {
    offlineQueue: createDexieOfflineQueue(database),
    sessionLog: createDexieSessionLog(database),
    planCache: createDexiePlanCache(database),
    localData: createDexieLocalData(database),
  };
}

const ADAPTERS: [string, () => Partial<Services>][] = [
  ['the in-memory twins', () => ({})],
  ['the IndexedDB adapters', () => dexieServices(new IDBFactory())],
];

/** One signed-in person with a program, a cached Session, a queued set and a finish on the device. */
async function withLocalData(services: Partial<Services>) {
  const setup = await setupSession({ services });
  await setup.mediator.send(getProgram());
  setup.network.online = false;
  await setup.mediator.send(logSet(setup.sessionId, setup.setFor(1)));
  await setup.mediator.send(finishSession(setup.sessionId, { id: newId(), rpe: 7 }));
  setup.network.online = true;
  return setup;
}

/** What is left on the device: queue entries, logged sets, finishes and cached values. */
async function localDataLeft(services: Services, sessionId: string) {
  const log = await services.sessionLog.read(sessionId);
  return {
    queued: (await services.offlineQueue.pending()).length,
    sets: log.sets.length,
    finished: log.finish !== null,
    cachedProgram: (await services.planCache.readProgram()) !== undefined,
    cachedSession: (await services.planCache.readSessionDetail(sessionId)) !== undefined,
  };
}

const NOTHING = { queued: 0, sets: 0, finished: false, cachedProgram: false, cachedSession: false };

describe.each(ADAPTERS)('per-user local data with %s', (_name, adapters) => {
  it('is all there before anything wipes it', async () => {
    const { services, sessionId } = await withLocalData(adapters());

    expect(await localDataLeft(services, sessionId)).toEqual({
      queued: 2,
      sets: 1,
      finished: true,
      cachedProgram: true,
      cachedSession: true,
    });
  });

  it('is wiped on sign-out: queue, sets, finishes and the cache', async () => {
    const { mediator, services, sessionId } = await withLocalData(adapters());

    await mediator.send(signOut());

    expect(await localDataLeft(services, sessionId)).toEqual(NOTHING);
  });

  it('is wiped when the account is deleted', async () => {
    const { mediator, services, sessionId } = await withLocalData(adapters());

    await mediator.send(deleteAccount());

    expect(await localDataLeft(services, sessionId)).toEqual(NOTHING);
  });

  it('is kept when deleting the account fails, since nothing was deleted', async () => {
    const adapter = adapters();
    const { mediator, services, sessionId, network } = await withLocalData(adapter);
    network.online = false;

    await expect(mediator.send(deleteAccount())).rejects.toBeDefined();

    expect((await localDataLeft(services, sessionId)).queued).toBe(2);
  });

  it('is wiped when a different user signs in without a sign-out in between', async () => {
    const { mediator, services, sessionId, sessionWrites } = await withLocalData(adapters());

    await mediator.send(verifyEmailCode(OTHER_EMAIL, FAKE_AUTH.validCode));

    expect(await localDataLeft(services, sessionId)).toEqual(NOTHING);
    expect(sessionWrites.at(-1)).toMatchObject({ status: SessionStatus.SignedIn });
  });

  it('is wiped when a different user is found signed in on app open (getSession)', async () => {
    const { mediator, services, sessionId } = await withLocalData(adapters());
    await services.auth.verifyEmailCode(OTHER_EMAIL, FAKE_AUTH.validCode);

    await mediator.send(getSession());

    expect(await localDataLeft(services, sessionId)).toEqual(NOTHING);
  });

  it('is kept when the same user signs in again or the app opens again', async () => {
    const { mediator, services, sessionId } = await withLocalData(adapters());
    const before = await localDataLeft(services, sessionId);

    await mediator.send(getSession());
    await mediator.send(verifyEmailCode('ada@example.com', FAKE_AUTH.validCode));

    expect(await localDataLeft(services, sessionId)).toEqual(before);
  });

  it('is never shown to the next user: their session starts empty and syncs nothing', async () => {
    const { mediator, services, sessionId, sync, server } = await withLocalData(adapters());
    await mediator.send(signOut());
    await mediator.send(verifyEmailCode(OTHER_EMAIL, FAKE_AUTH.validCode));

    expect(await sync()).toEqual({ replayed: 0, remaining: 0 });
    expect((await services.sessionLog.read(sessionId)).sets).toEqual([]);
    await expect(server.getSession(sessionId)).rejects.toMatchObject({ status: 404 });
  });
});

describe('the owner survives a reload (IndexedDB)', () => {
  it('keeps the data for the same user and wipes it for another after the app reopens', async () => {
    const indexedDB = new IDBFactory();
    const first = await withLocalData(dexieServices(indexedDB));

    const same = reloadSession(first, dexieServices(indexedDB));
    same.network.online = true;
    await same.mediator.send(getSession());
    expect((await localDataLeft(same.services, first.sessionId)).queued).toBe(2);

    await first.services.auth.verifyEmailCode(OTHER_EMAIL, FAKE_AUTH.validCode);
    const other = reloadSession(first, dexieServices(indexedDB));
    other.network.online = true;
    await other.mediator.send(getSession());
    expect(await localDataLeft(other.services, first.sessionId)).toEqual(NOTHING);
  });
});
