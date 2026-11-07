import {
  ApiError,
  NutritionStatus,
  SaveNutritionSetupRejection,
  SaveNutritionSetupStatus,
  type ApiClient,
  type LogWater,
  type NutritionSetup,
  type NutritionState,
} from '@stamina/contracts';
import {
  BodyDirection,
  CookingEffort,
  DayType,
  EatingPattern,
  EnergySex,
  EverydayActivity,
  Goal,
  ScreeningQuestion,
  WaterAmount,
  addDays,
} from '@stamina/domain';
import { newId } from '@stamina/ids';
import { describe, expect, it } from 'vitest';
import { QUEUED_RESULT } from '../config.ts';
import { createAppSync } from '../create-app-sync.ts';
import { createServices } from '../create-services.ts';
import { ServicesMode } from '../enums/services-mode.ts';
import { AppErrorCode, getNutrition, logWater, saveNutritionSetup, signOut } from '../index.ts';
import { buildProfileAnswers } from '../testing/build-profile-answers.ts';
import { readyToTrain } from '../testing/ready-to-train.ts';

const today = () => new Date().toISOString().slice(0, 10);

const setupOf = (overrides: Partial<NutritionSetup> = {}): NutritionSetup => ({
  sex: EnergySex.Male,
  heightCm: 180,
  weightKg: 80,
  everydayActivity: EverydayActivity.OnFeet,
  eatingPattern: EatingPattern.Everything,
  allergens: [],
  dislikes: [],
  mealsPerDay: 3,
  cookingEffort: CookingEffort.Normal,
  bodyDirection: null,
  ...overrides,
});

const waterOf = (overrides: Partial<LogWater> = {}): LogWater => ({
  id: newId(),
  ml: WaterAmount.Small,
  date: today(),
  ...overrides,
});

/** A person who plays no fixed days (so every day is a rest day), with a switch for the network and a sync runner. */
async function setup(
  answers = buildProfileAnswers({ playVaries: true, playDays: [] }),
  yes: ScreeningQuestion[] = [],
  wrapApi?: (api: ApiClient) => ApiClient,
) {
  const network = { online: true };
  const base = createServices({ mode: ServicesMode.Test });
  const ready = await readyToTrain(answers, yes, {
    api: wrapApi ? wrapApi(base.api) : base.api,
    auth: base.auth,
    network: { isOnline: () => network.online },
  });
  const sync = createAppSync({ services: ready.services, stores: ready.stores });
  return { ...ready, network, sync, server: base.api };
}

/** The water of the day Meals shows, failing when Meals is not ready. */
async function waterOn(read: () => Promise<NutritionState>) {
  const state = await read();
  if (state.status !== NutritionStatus.Ready) throw new Error(`nutrition is ${state.status}`);
  return state.water;
}

describe('Meals through the mediator', () => {
  describe('Unlock Meals', () => {
    it('is locked until the setup is saved, then ready for today with the saved basis weight', async () => {
      const { mediator } = await setup();
      expect(await mediator.send(getNutrition(today()))).toEqual({
        status: NutritionStatus.Locked,
      });

      const saved = await mediator.send(saveNutritionSetup(setupOf()));

      expect(saved).toMatchObject({ status: SaveNutritionSetupStatus.Saved });
      const state = await mediator.send(getNutrition(today()));
      expect(state).toMatchObject({
        status: NutritionStatus.Ready,
        date: today(),
        setup: { weightKg: 80 },
        targets: { dayType: DayType.Rest, drinksMl: 2000 },
        water: { ml: 0, targetMl: 2000 },
      });
      expect(state.status === NutritionStatus.Ready && state.meals).toHaveLength(3);
    });

    it('refuses an invalid setup before anything is sent, online or off', async () => {
      const { mediator, network, server } = await setup();

      for (const online of [true, false]) {
        network.online = online;
        for (const bad of [
          setupOf({ heightCm: 100 }),
          setupOf({ weightKg: 10 }),
          setupOf({ mealsPerDay: 2 }),
        ]) {
          await expect(mediator.send(saveNutritionSetup(bad))).rejects.toMatchObject({
            code: AppErrorCode.ValidationFailed,
          });
        }
      }

      expect((await server.getNutrition(today())).status).toBe(NutritionStatus.Locked);
    });

    it('rejects Offline and keeps nothing while offline', async () => {
      const { mediator, network, server } = await setup();
      network.online = false;

      await expect(mediator.send(saveNutritionSetup(setupOf()))).rejects.toMatchObject({
        code: AppErrorCode.Offline,
      });

      expect((await server.getNutrition(today())).status).toBe(NutritionStatus.Locked);
    });

    it('answers a body direction without a body-composition Goal as Rejected, a result and not an error', async () => {
      const { mediator } = await setup();

      const result = await mediator.send(
        saveNutritionSetup(setupOf({ bodyDirection: BodyDirection.LoseFat })),
      );

      expect(result).toEqual({
        status: SaveNutritionSetupStatus.Rejected,
        reason: SaveNutritionSetupRejection.BodyDirectionNotAllowed,
      });
      expect((await mediator.send(getNutrition(today()))).status).toBe(NutritionStatus.Locked);
    });

    it('takes a body direction for a body-composition Goal and applies it', async () => {
      const { mediator } = await setup(
        buildProfileAnswers({ goal: Goal.BodyComposition, playVaries: true, playDays: [] }),
      );

      await mediator.send(saveNutritionSetup(setupOf({ bodyDirection: BodyDirection.LoseFat })));

      expect(await mediator.send(getNutrition(today()))).toMatchObject({
        setup: { bodyDirection: BodyDirection.LoseFat },
        targets: { deficitKcal: -400 },
      });
    });

    it('is off for a person whose Screening turned Nutrition off: no targets, no setup', async () => {
      const { mediator } = await setup(undefined, [ScreeningQuestion.EatingDisorder]);

      expect(await mediator.send(getNutrition(today()))).toEqual({ status: NutritionStatus.Off });
      expect(await mediator.send(saveNutritionSetup(setupOf()))).toEqual({
        status: SaveNutritionSetupStatus.Rejected,
        reason: SaveNutritionSetupRejection.NutritionOff,
      });
    });
  });

  describe('logging water', () => {
    it('writes the log locally, sends it, and counts it once in the day', async () => {
      const { mediator, services, server } = await setup();
      await mediator.send(saveNutritionSetup(setupOf()));
      const first = waterOf({ ml: WaterAmount.Small });

      const result = await mediator.send(logWater(first));
      await mediator.send(logWater(waterOf({ ml: WaterAmount.Large })));

      expect(result).toEqual({ id: first.id, date: today(), ml: WaterAmount.Small });
      expect(await services.waterLog.list()).toEqual([]);
      expect(await services.offlineQueue.pending()).toEqual([]);
      expect(await waterOn(() => mediator.send(getNutrition(today())))).toEqual({
        ml: 750,
        targetMl: 2000,
      });
      expect(await waterOn(() => server.getNutrition(today()))).toMatchObject({ ml: 750 });
    });

    it('takes only 250 or 500 ml, refusing anything else before it is written or queued', async () => {
      const { mediator, services, network } = await setup();
      await mediator.send(saveNutritionSetup(setupOf()));

      for (const online of [true, false]) {
        network.online = online;
        for (const ml of [0, 100, 300, 1000]) {
          await expect(
            mediator.send(logWater({ ...waterOf(), ml: ml as WaterAmount })),
          ).rejects.toMatchObject({ code: AppErrorCode.ValidationFailed });
        }
      }

      expect(await services.waterLog.list()).toEqual([]);
      expect(await services.offlineQueue.pending()).toEqual([]);
    });

    it('is refused with a 422 while Nutrition is off, and leaves nothing on the device or in the queue', async () => {
      const { mediator, services } = await setup(undefined, [ScreeningQuestion.EatingDisorder]);

      await expect(mediator.send(logWater(waterOf()))).rejects.toBeDefined();

      expect(await services.waterLog.list()).toEqual([]);
      expect(await services.offlineQueue.pending()).toEqual([]);
    });

    describe('offline', () => {
      it('queues the log, keeps it on the device and counts it in the day’s water', async () => {
        const { mediator, network, services } = await setup();
        await mediator.send(saveNutritionSetup(setupOf()));
        await mediator.send(getNutrition(today()));
        network.online = false;
        const water = waterOf({ ml: WaterAmount.Large });

        expect(await mediator.send(logWater(water))).toBe(QUEUED_RESULT);

        expect((await services.waterLog.list()).map((row) => row.water.id)).toEqual([water.id]);
        expect(await services.offlineQueue.pending()).toHaveLength(1);
        expect(await waterOn(() => mediator.send(getNutrition(today())))).toMatchObject({
          ml: 500,
        });
        await mediator.send(logWater(waterOf({ ml: WaterAmount.Small })));
        expect(await waterOn(() => mediator.send(getNutrition(today())))).toMatchObject({
          ml: 750,
        });
      });

      it('replays on reconnect once, and the day does not count it twice', async () => {
        const { mediator, network, services, sync, server } = await setup();
        await mediator.send(saveNutritionSetup(setupOf()));
        await mediator.send(getNutrition(today()));
        network.online = false;
        await mediator.send(logWater(waterOf({ ml: WaterAmount.Large })));
        network.online = true;

        expect(await sync()).toEqual({ replayed: 1, remaining: 0 });
        expect(await sync()).toEqual({ replayed: 0, remaining: 0 });

        expect(await waterOn(() => server.getNutrition(today()))).toMatchObject({ ml: 500 });
        expect(await services.waterLog.list()).toEqual([]);
        expect(await waterOn(() => mediator.send(getNutrition(today())))).toMatchObject({
          ml: 500,
        });
      });

      it('rejects Offline for a day never fetched, and for any other day than the one kept', async () => {
        const { mediator, network } = await setup();
        await mediator.send(saveNutritionSetup(setupOf()));
        network.online = false;

        await expect(mediator.send(getNutrition(today()))).rejects.toMatchObject({
          code: AppErrorCode.Offline,
        });

        network.online = true;
        await mediator.send(getNutrition(today()));
        network.online = false;
        await expect(mediator.send(getNutrition(addDays(today(), -1)))).rejects.toMatchObject({
          code: AppErrorCode.Offline,
        });
        expect((await mediator.send(getNutrition(today()))).status).toBe(NutritionStatus.Ready);
      });

      it('queues the log when the send cannot reach the server, and a sync delivers it once', async () => {
        let calls = 0;
        const { mediator, services, sync, server } = await setup(undefined, [], (api) => ({
          ...api,
          logWater: async (water) => {
            calls += 1;
            if (calls === 1) throw new TypeError('Failed to fetch');
            return api.logWater(water);
          },
        }));
        await mediator.send(saveNutritionSetup(setupOf()));

        expect(await mediator.send(logWater(waterOf()))).toBe(QUEUED_RESULT);
        expect(await services.offlineQueue.pending()).toHaveLength(1);
        expect(await sync()).toEqual({ replayed: 1, remaining: 0 });

        expect(await waterOn(() => server.getNutrition(today()))).toMatchObject({ ml: 250 });
        expect(await services.waterLog.list()).toEqual([]);
      });

      it('does not count a log twice when the server saved it but the answer was lost', async () => {
        let calls = 0;
        const { mediator, services, sync, server } = await setup(undefined, [], (api) => ({
          ...api,
          logWater: async (water) => {
            calls += 1;
            const stored = await api.logWater(water);
            if (calls === 1) throw new TypeError('Failed to fetch');
            return stored;
          },
        }));
        await mediator.send(saveNutritionSetup(setupOf()));

        expect(await mediator.send(logWater(waterOf()))).toBe(QUEUED_RESULT);
        await sync();

        expect(await waterOn(() => server.getNutrition(today()))).toMatchObject({ ml: 250 });
        expect(await waterOn(() => mediator.send(getNutrition(today())))).toMatchObject({
          ml: 250,
        });
        expect(await services.waterLog.list()).toEqual([]);
      });
    });

    describe('a permanent client error', () => {
      it.each([400, 404, 409, 422])(
        'on an online send (%i) takes the log off the device and queues nothing',
        async (status) => {
          const { mediator, services } = await setup(undefined, [], (api) => ({
            ...api,
            logWater: async () => {
              throw new ApiError(status);
            },
          }));

          await expect(mediator.send(logWater(waterOf()))).rejects.toBeDefined();

          expect(await services.waterLog.list()).toEqual([]);
          expect(await services.offlineQueue.pending()).toEqual([]);
        },
      );

      it('on a replay drops the queued log and its local row', async () => {
        const { mediator, network, services, sync } = await setup(undefined, [], (api) => ({
          ...api,
          logWater: async () => {
            throw new ApiError(400);
          },
        }));
        network.online = false;
        await mediator.send(logWater(waterOf()));
        network.online = true;

        expect(await sync()).toEqual({ replayed: 1, remaining: 0 });

        expect(await services.waterLog.list()).toEqual([]);
        expect(await services.offlineQueue.pending()).toEqual([]);
      });
    });
  });

  describe('on this device', () => {
    it('is wiped with the rest of the local data: logs and the cached day', async () => {
      const { mediator, network, services } = await setup();
      await mediator.send(saveNutritionSetup(setupOf()));
      await mediator.send(getNutrition(today()));
      network.online = false;
      await mediator.send(logWater(waterOf()));

      await services.localData.clear();

      expect(await services.waterLog.list()).toEqual([]);
      expect(await services.planCache.readNutrition(today())).toBeUndefined();
    });

    it('sends unsynced water before signing out, then leaves nothing on the device', async () => {
      const delivered: string[] = [];
      const { mediator, network, services } = await setup(undefined, [], (api) => ({
        ...api,
        logWater: async (water) => {
          delivered.push(water.id);
          return api.logWater(water);
        },
      }));
      await mediator.send(saveNutritionSetup(setupOf()));
      network.online = false;
      const water = waterOf({ ml: WaterAmount.Large });
      await mediator.send(logWater(water));
      network.online = true;

      await mediator.send(signOut());

      expect(delivered).toEqual([water.id]);
      expect(await services.waterLog.list()).toEqual([]);
      expect(await services.offlineQueue.pending()).toEqual([]);
    });
  });
});
