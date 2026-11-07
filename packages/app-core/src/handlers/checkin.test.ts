import { ApiError, RecordStatus, type ApiClient, type SubmitCheckin } from '@stamina/contracts';
import { newId } from '@stamina/ids';
import { describe, expect, it } from 'vitest';
import { QUEUED_RESULT } from '../config.ts';
import { createAppSync } from '../create-app-sync.ts';
import { createServices } from '../create-services.ts';
import { ServicesMode } from '../enums/services-mode.ts';
import { AppErrorCode, exportData, getLatestCheckin, submitCheckin } from '../index.ts';
import { signedUp } from '../testing/signed-up.ts';

const today = () => new Date().toISOString().slice(0, 10);

const checkinOn = (date: string, overrides: Partial<SubmitCheckin> = {}): SubmitCheckin => ({
  id: newId(),
  date,
  sleep: 4,
  soreness: 2,
  energy: 3,
  ...overrides,
});

/** A signed-up person, with a switch for the network, a sync runner and a way to wrap the API. */
async function setup(wrapApi?: (api: ApiClient) => ApiClient) {
  const network = { online: true };
  const base = createServices({ mode: ServicesMode.Test });
  const ready = await signedUp(undefined, {
    api: wrapApi ? wrapApi(base.api) : base.api,
    auth: base.auth,
    network: { isOnline: () => network.online },
  });
  const sync = createAppSync({ services: ready.services, stores: ready.stores });
  return { ...ready, network, sync, server: base.api };
}

describe('the daily Check-in through the mediator', () => {
  it('has no latest Check-in before the first', async () => {
    const { mediator } = await setup();

    expect(await mediator.send(getLatestCheckin())).toBeNull();
  });

  it('writes the Check-in locally, sends it and reads it back as the latest', async () => {
    const { mediator, services, server } = await setup();
    const checkin = checkinOn(today());

    const result = await mediator.send(submitCheckin(checkin));

    expect(result).toMatchObject({ status: RecordStatus.Saved, recorded: true });
    expect((await services.checkins.latest())?.checkin).toEqual(checkin);
    expect(await mediator.send(getLatestCheckin())).toMatchObject(checkin);
    expect(await server.getLatestCheckin()).toMatchObject(checkin);
    expect(await services.offlineQueue.pending()).toEqual([]);
  });

  it('answers a repeat of the same id with recorded false', async () => {
    const { mediator } = await setup();
    const checkin = checkinOn(today());

    await mediator.send(submitCheckin(checkin));

    expect(await mediator.send(submitCheckin(checkin))).toMatchObject({ recorded: false });
  });

  it('refuses a score outside 1 to 5 before anything is written or queued', async () => {
    const { mediator, services, network } = await setup();

    for (const online of [true, false]) {
      network.online = online;
      await expect(
        mediator.send(submitCheckin(checkinOn(today(), { sleep: 6 }))),
      ).rejects.toMatchObject({ code: AppErrorCode.ValidationFailed });
      await expect(
        mediator.send(submitCheckin(checkinOn(today(), { energy: 0 }))),
      ).rejects.toMatchObject({ code: AppErrorCode.ValidationFailed });
    }

    expect(await services.checkins.latest()).toBeNull();
    expect(await services.offlineQueue.pending()).toEqual([]);
  });

  it('reads the latest by day, not by when it was sent', async () => {
    const { mediator } = await setup();
    const later = checkinOn('2026-11-06');
    await mediator.send(submitCheckin(later));
    await mediator.send(submitCheckin(checkinOn('2026-11-05')));

    expect((await mediator.send(getLatestCheckin()))?.id).toBe(later.id);
  });

  describe('offline', () => {
    it('queues the Check-in, keeps it on the device and returns it as the latest', async () => {
      const { mediator, network, services } = await setup();
      network.online = false;
      const checkin = checkinOn(today());

      expect(await mediator.send(submitCheckin(checkin))).toBe(QUEUED_RESULT);

      expect((await services.checkins.latest())?.checkin.id).toBe(checkin.id);
      expect(await services.offlineQueue.pending()).toHaveLength(1);
      expect(await mediator.send(getLatestCheckin())).toMatchObject(checkin);
    });

    it('prefers a newer local Check-in over the cached server one', async () => {
      const { mediator, network } = await setup();
      await mediator.send(submitCheckin(checkinOn('2026-11-05')));
      await mediator.send(getLatestCheckin());
      network.online = false;
      const newer = checkinOn('2026-11-06');
      await mediator.send(submitCheckin(newer));

      expect((await mediator.send(getLatestCheckin()))?.id).toBe(newer.id);
    });

    it('serves the cached server Check-in when nothing newer is local', async () => {
      const { mediator, network } = await setup();
      const checkin = checkinOn('2026-11-06');
      await mediator.send(submitCheckin(checkin));
      await mediator.send(getLatestCheckin());
      network.online = false;

      expect((await mediator.send(getLatestCheckin()))?.id).toBe(checkin.id);
    });

    it('is null offline when nothing was ever fetched or recorded', async () => {
      const { mediator, network } = await setup();
      network.online = false;

      expect(await mediator.send(getLatestCheckin())).toBeNull();
    });

    it('replays on reconnect once', async () => {
      let calls = 0;
      const { mediator, network, sync, server } = await setup((api) => ({
        ...api,
        submitCheckin: (checkin) => {
          calls += 1;
          return api.submitCheckin(checkin);
        },
      }));
      network.online = false;
      const checkin = checkinOn(today());
      await mediator.send(submitCheckin(checkin));
      network.online = true;

      expect(await sync()).toEqual({ replayed: 1, remaining: 0 });
      expect(await sync()).toEqual({ replayed: 0, remaining: 0 });

      expect(calls).toBe(1);
      expect((await server.getLatestCheckin())?.id).toBe(checkin.id);
      expect((await mediator.send(getLatestCheckin()))?.id).toBe(checkin.id);
    });

    it('queues the Check-in when the send cannot reach the server, and a sync delivers it', async () => {
      let calls = 0;
      const { mediator, services, sync, server } = await setup((api) => ({
        ...api,
        submitCheckin: async (checkin) => {
          calls += 1;
          if (calls === 1) throw new TypeError('Failed to fetch');
          return api.submitCheckin(checkin);
        },
      }));

      expect(await mediator.send(submitCheckin(checkinOn(today())))).toBe(QUEUED_RESULT);
      expect(await services.offlineQueue.pending()).toHaveLength(1);
      expect(await sync()).toEqual({ replayed: 1, remaining: 0 });
      expect(await server.getLatestCheckin()).not.toBeNull();
    });
  });

  describe('a permanent client error', () => {
    it.each([400, 404, 422])(
      'on an online send (%i) takes the Check-in off the device and queues nothing',
      async (status) => {
        const { mediator, services } = await setup((api) => ({
          ...api,
          submitCheckin: async () => {
            throw new ApiError(status);
          },
        }));

        await expect(mediator.send(submitCheckin(checkinOn(today())))).rejects.toBeDefined();

        expect(await services.checkins.latest()).toBeNull();
        expect(await services.offlineQueue.pending()).toEqual([]);
      },
    );

    it('on a replay drops the queued Check-in and its local row', async () => {
      const { mediator, network, services, sync } = await setup((api) => ({
        ...api,
        submitCheckin: async () => {
          throw new ApiError(422);
        },
      }));
      network.online = false;
      await mediator.send(submitCheckin(checkinOn(today())));
      network.online = true;

      expect(await sync()).toEqual({ replayed: 1, remaining: 0 });

      expect(await services.checkins.latest()).toBeNull();
      expect(await services.offlineQueue.pending()).toEqual([]);
    });
  });
});

describe('the data export', () => {
  it('lists the Check-ins submitted, oldest first', async () => {
    const { mediator } = await setup();
    const first = checkinOn('2026-11-05');
    const second = checkinOn('2026-11-06');
    await mediator.send(submitCheckin(first));
    await mediator.send(submitCheckin(second));

    const { checkins } = await mediator.send(exportData());

    expect(checkins.map(({ id }) => id)).toEqual([first.id, second.id]);
  });
});
