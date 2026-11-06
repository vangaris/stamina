import { ApiError, type ApiClient } from '@stamina/contracts';
import { describe, expect, it } from 'vitest';
import { AppErrorCode, deleteAccount, getSessionDetail, logSet, signOut } from '../index.ts';
import { SessionStatus } from '../enums/session-status.ts';
import { setupSession } from '../testing/setup-session.ts';

const SERVICE_UNAVAILABLE = 503;

/** A server that cannot be reached for sets: every `logSet` call fails with a retryable error. */
const unavailable = (api: ApiClient): ApiClient => ({
  ...api,
  logSet: async () => {
    throw new ApiError(SERVICE_UNAVAILABLE);
  },
});

/** A signed-in person with one set logged offline, now back online. */
async function withQueuedSet(wrapApi?: (api: ApiClient) => ApiClient) {
  const setup = await setupSession(wrapApi ? { wrapApi } : {});
  setup.network.online = false;
  await setup.mediator.send(logSet(setup.sessionId, setup.setFor(1)));
  setup.network.online = true;
  return setup;
}

describe('signing out with Session logs still waiting', () => {
  it('sends them first, then signs out and wipes the device', async () => {
    const received: string[] = [];
    const { mediator, services, sessionId, sessionWrites } = await withQueuedSet((api) => ({
      ...api,
      logSet: async (id, set) => {
        received.push(set.id);
        return api.logSet(id, set);
      },
    }));

    await mediator.send(signOut());

    expect(received).toHaveLength(1);
    expect(await services.offlineQueue.pending()).toEqual([]);
    expect(await services.auth.getSession()).toBeUndefined();
    expect(await services.planCache.readSessionDetail(sessionId)).toBeUndefined();
    expect(sessionWrites.at(-1)).toEqual({ status: SessionStatus.SignedOut });
  });

  it('refuses with UnsyncedData and keeps the person signed in and their logs on the device when they cannot be sent', async () => {
    const { mediator, services, sessionId, sessionWrites } = await withQueuedSet(unavailable);
    const writesBefore = sessionWrites.length;

    await expect(mediator.send(signOut())).rejects.toMatchObject({
      code: AppErrorCode.UnsyncedData,
    });

    expect(await services.auth.getSession()).toBeDefined();
    expect(await services.offlineQueue.pending()).toHaveLength(1);
    expect((await services.sessionLog.read(sessionId)).sets).toHaveLength(1);
    expect((await mediator.send(getSessionDetail(sessionId))).exercises.length).toBeGreaterThan(0);
    expect(sessionWrites).toHaveLength(writesBefore);
  });

  it('signs out once the logs can be sent', async () => {
    let reachable = false;
    const { mediator, services } = await withQueuedSet((api) => ({
      ...api,
      logSet: async (sessionId, set) => {
        if (!reachable) throw new ApiError(SERVICE_UNAVAILABLE);
        return api.logSet(sessionId, set);
      },
    }));
    await expect(mediator.send(signOut())).rejects.toMatchObject({
      code: AppErrorCode.UnsyncedData,
    });

    reachable = true;
    await mediator.send(signOut());

    expect(await services.auth.getSession()).toBeUndefined();
    expect(await services.offlineQueue.pending()).toEqual([]);
  });

  it('signs out at once when nothing is waiting', async () => {
    const { mediator, services } = await setupSession();

    await mediator.send(signOut());

    expect(await services.auth.getSession()).toBeUndefined();
  });
});

describe('deleting the account with Session logs still waiting', () => {
  it('wipes the device regardless', async () => {
    const { mediator, services, sessionId } = await withQueuedSet(unavailable);

    await mediator.send(deleteAccount());

    expect(await services.offlineQueue.pending()).toEqual([]);
    expect((await services.sessionLog.read(sessionId)).sets).toEqual([]);
  });
});
