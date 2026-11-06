import { ConsentPurpose, ScreeningQuestion } from '@stamina/domain';
import { Locale } from '@stamina/i18n';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import {
  AppErrorCode,
  deleteAccount,
  getSafety,
  grantConsent,
  recordDoctorOk,
  saveScreening,
  SafetyStatus,
  signOut,
} from '../index.ts';
import { createDexieLocalData } from '../services/create-dexie-local-data.ts';
import { createDexiePlanCache } from '../services/create-dexie-plan-cache.ts';
import { createLocalDatabase } from '../services/create-local-database.ts';
import { buildScreeningSubmission } from '../testing/build-screening-submission.ts';
import { readyToTrain } from '../testing/ready-to-train.ts';
import { setupMediator } from '../testing/setup-mediator.ts';
import type { Services } from '../types.ts';

function dexieServices(indexedDB: IDBFactory): Partial<Services> {
  const database = createLocalDatabase({ indexedDB, IDBKeyRange });
  return { planCache: createDexiePlanCache(database), localData: createDexieLocalData(database) };
}

const ADAPTERS: [string, () => Partial<Services>][] = [
  ['the in-memory twin', () => ({})],
  ['the IndexedDB adapter', () => dexieServices(new IDBFactory())],
];

/** A cleared person whose Ready state is cached because `getSafety` ran once online. */
async function clearedAndCached(adapters: Partial<Services>, yes: ScreeningQuestion[] = []) {
  const network = { online: true };
  const setup = await readyToTrain(undefined, yes, {
    network: { isOnline: () => network.online },
    ...adapters,
  });
  const first = await setup.mediator.send(getSafety());
  return { ...setup, network, first };
}

const rejectsOffline = (promise: Promise<unknown>) =>
  expect(promise).rejects.toMatchObject({ code: AppErrorCode.Offline });

describe.each(ADAPTERS)('getSafety without signal with %s', (_name, adapters) => {
  it('opens a person last found Ready, with the screening they were cleared with', async () => {
    const { mediator, network, first } = await clearedAndCached(adapters());
    network.online = false;

    expect(first.status).toBe(SafetyStatus.Ready);
    expect(await mediator.send(getSafety())).toEqual(first);
  });

  it('rejects Offline when nothing is cached, as for a person who never opened it online', async () => {
    const network = { online: false };
    const { mediator } = setupMediator({ network: { isOnline: () => network.online } });

    await rejectsOffline(mediator.send(getSafety()));
  });

  it('rejects Offline when the person was last found Referred: that state is never cached', async () => {
    const { mediator, network } = await clearedAndCached(adapters(), [
      ScreeningQuestion.HeartCondition,
    ]);
    network.online = false;

    await rejectsOffline(mediator.send(getSafety()));
  });

  it('forgets a Ready the server no longer confirms: online non-Ready deletes it', async () => {
    const { mediator, network, services } = await clearedAndCached(adapters());
    // Straight to the server, as another device would: this app saw no write.
    await services.api.saveScreening(buildScreeningSubmission([ScreeningQuestion.HeartCondition]));

    expect(await mediator.send(getSafety())).toMatchObject({ status: SafetyStatus.Referred });
    network.online = false;

    await rejectsOffline(mediator.send(getSafety()));
  });

  it('drops the cached Ready when this app saves a new Screening', async () => {
    const { mediator, network } = await clearedAndCached(adapters());

    await mediator.send(
      saveScreening(buildScreeningSubmission([ScreeningQuestion.HeartCondition])),
    );
    network.online = false;

    await rejectsOffline(mediator.send(getSafety()));
  });

  it('drops the cached Ready when this app saves a consent', async () => {
    const { mediator, network } = await clearedAndCached(adapters());

    await mediator.send(grantConsent({ purpose: ConsentPurpose.Disclaimer, locale: Locale.En }));
    network.online = false;

    await rejectsOffline(mediator.send(getSafety()));
  });

  it('drops the cached Ready when this app records a doctor statement', async () => {
    const { mediator, network } = await clearedAndCached(adapters());

    await mediator.send(recordDoctorOk());
    network.online = false;

    await rejectsOffline(mediator.send(getSafety()));
  });

  it('is wiped on sign-out', async () => {
    const { mediator, network } = await clearedAndCached(adapters());

    await mediator.send(signOut());
    network.online = false;

    await rejectsOffline(mediator.send(getSafety()));
  });

  it('is wiped when the account is deleted', async () => {
    const { mediator, network } = await clearedAndCached(adapters());

    await mediator.send(deleteAccount());
    network.online = false;

    await rejectsOffline(mediator.send(getSafety()));
  });
});

describe('getSafety after a reload', () => {
  it('still opens a cached Ready from IndexedDB, and not a wiped one', async () => {
    const indexedDB = new IDBFactory();
    const before = await clearedAndCached(dexieServices(indexedDB));

    const reopened = (online: boolean) =>
      setupMediator({
        api: before.services.api,
        auth: before.services.auth,
        network: { isOnline: () => online },
        ...dexieServices(indexedDB),
      });
    expect(await reopened(false).mediator.send(getSafety())).toEqual(before.first);

    await before.mediator.send(signOut());
    await rejectsOffline(reopened(false).mediator.send(getSafety()));
  });
});
