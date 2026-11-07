import { AppError, AppErrorCode, RequestType } from '@stamina/app-core';
import { NutritionStatus } from '@stamina/contracts';
import { MealLogStatus, TEMPLATES, WaterAmount } from '@stamina/domain';
import { describe, expect, it } from 'vitest';
import { RoutePath } from '../../../enums/route-path.ts';
import { NutritionLoadStatus } from '../enums/nutrition-load-status.ts';
import { NutritionMessageKey } from '../enums/nutrition-message-key.ts';
import { MealMessageKey } from '../enums/meal-message-key.ts';
import { WaterMessageKey } from '../enums/water-message-key.ts';
import { makeReadyNutrition } from '../testing/make-ready-nutrition.ts';
import { setupNutrition } from '../testing/setup-nutrition.ts';

describe('useNutrition', () => {
  describe('loading', () => {
    it("reads the person's own day", async () => {
      const setup = setupNutrition();
      setup.state.nutrition = makeReadyNutrition();

      await setup.flow.load();

      expect(setup.flow.status.value).toBe(NutritionLoadStatus.Ready);
      expect(setup.dates).toEqual(['2026-11-07']);
      expect(setup.flow.nutrition.value?.status).toBe(NutritionStatus.Ready);
    });

    it('shows a locked day as it is', async () => {
      const setup = setupNutrition();

      await setup.flow.load();

      expect(setup.flow.nutrition.value).toEqual({ status: NutritionStatus.Locked });
    });

    it('says so when there is nothing to show and no signal', async () => {
      const setup = setupNutrition();
      setup.state.nutritionError = new AppError(AppErrorCode.Offline);

      await setup.flow.load();

      expect(setup.flow.status.value).toBe(NutritionLoadStatus.Failed);
      expect(setup.flow.messageKey.value).toBe(NutritionMessageKey.Offline);
    });

    it('keeps what it shows when a later read fails', async () => {
      const setup = setupNutrition();
      setup.state.nutrition = makeReadyNutrition();
      await setup.flow.load();
      setup.state.nutritionError = new Error('boom');

      await setup.flow.load();

      expect(setup.flow.status.value).toBe(NutritionLoadStatus.Ready);
      expect(setup.flow.nutrition.value?.status).toBe(NutritionStatus.Ready);
    });

    it('sends a signed-out person to start', async () => {
      const setup = setupNutrition();
      setup.state.nutritionError = new AppError(AppErrorCode.Unauthorized);

      await setup.flow.load();

      expect(setup.onNavigate).toHaveBeenCalledWith(RoutePath.Start);
    });
  });

  describe('water', () => {
    it('logs the amount with a made id and the persons day, then shows the new total', async () => {
      const setup = setupNutrition();
      setup.state.nutrition = makeReadyNutrition();
      await setup.flow.load();

      await setup.flow.addWater(WaterAmount.Small);

      expect(setup.waterLogs).toEqual([{ id: 'water-1', ml: 250, date: '2026-11-07' }]);
      const day = setup.flow.nutrition.value;
      expect(day?.status === NutritionStatus.Ready && day.water.ml).toBe(250);
      expect(setup.requests.map((request) => request.type)).toEqual([
        RequestType.GetNutrition,
        RequestType.LogWater,
        RequestType.GetNutrition,
      ]);
    });

    it('uses a new id for each tap', async () => {
      const setup = setupNutrition();
      setup.state.nutrition = makeReadyNutrition();
      await setup.flow.load();

      await setup.flow.addWater(WaterAmount.Small);
      await setup.flow.addWater(WaterAmount.Large);

      expect(setup.waterLogs.map(({ id }) => id)).toEqual(['water-1', 'water-2']);
      const day = setup.flow.nutrition.value;
      expect(day?.status === NutritionStatus.Ready && day.water.ml).toBe(750);
    });

    it('says so and shows no change when the log fails', async () => {
      const setup = setupNutrition();
      setup.state.nutrition = makeReadyNutrition();
      await setup.flow.load();
      setup.state.waterError = new Error('boom');

      await setup.flow.addWater(WaterAmount.Small);

      expect(setup.flow.waterMessageKey.value).toBe(WaterMessageKey.Failed);
      const day = setup.flow.nutrition.value;
      expect(day?.status === NutritionStatus.Ready && day.water.ml).toBe(0);
    });

    it('logs nothing while Meals is locked', async () => {
      const setup = setupNutrition();
      await setup.flow.load();

      await setup.flow.addWater(WaterAmount.Small);

      expect(setup.waterLogs).toEqual([]);
    });
  });

  describe('meals', () => {
    function readyWithIdeas() {
      const base = makeReadyNutrition();
      const idea = {
        templateId: TEMPLATES[0]!.id,
        portions: [],
        kcal: 450,
        proteinG: 28,
        carbsG: 52,
        fatG: 14,
      };
      return makeReadyNutrition({
        meals: base.meals.map((meal, index) => (index === 0 ? { ...meal, idea } : meal)),
      });
    }

    it('logs the slot with a made id, the persons day and the dish, then shows the status', async () => {
      const setup = setupNutrition();
      setup.state.nutrition = readyWithIdeas();
      await setup.flow.load();

      await setup.flow.addMeal(0, MealLogStatus.Ate);

      expect(setup.mealLogs).toEqual([
        {
          id: 'water-1',
          date: '2026-11-07',
          slotIndex: 0,
          status: MealLogStatus.Ate,
          templateId: TEMPLATES[0]!.id,
        },
      ]);
      const day = setup.flow.nutrition.value;
      expect(day?.status === NutritionStatus.Ready && day.meals[0]?.status).toBe(MealLogStatus.Ate);
      expect(setup.requests.map((request) => request.type)).toEqual([
        RequestType.GetNutrition,
        RequestType.LogMeal,
        RequestType.GetNutrition,
      ]);
    });

    it('logs a slot with no idea without a dish', async () => {
      const setup = setupNutrition();
      setup.state.nutrition = readyWithIdeas();
      await setup.flow.load();

      await setup.flow.addMeal(1, MealLogStatus.Skipped);

      expect(setup.mealLogs).toEqual([
        { id: 'water-1', date: '2026-11-07', slotIndex: 1, status: MealLogStatus.Skipped },
      ]);
    });

    it('says so and shows no change when the log fails', async () => {
      const setup = setupNutrition();
      setup.state.nutrition = readyWithIdeas();
      await setup.flow.load();
      setup.state.mealError = new Error('boom');

      await setup.flow.addMeal(0, MealLogStatus.Ate);

      expect(setup.flow.mealMessageKey.value).toBe(MealMessageKey.Failed);
      const day = setup.flow.nutrition.value;
      expect(day?.status === NutritionStatus.Ready && day.meals[0]?.status).toBeNull();
    });

    it('logs nothing while Meals is locked or for a slot that is not there', async () => {
      const locked = setupNutrition();
      await locked.flow.load();
      await locked.flow.addMeal(0, MealLogStatus.Ate);
      expect(locked.mealLogs).toEqual([]);

      const ready = setupNutrition();
      ready.state.nutrition = readyWithIdeas();
      await ready.flow.load();
      await ready.flow.addMeal(9, MealLogStatus.Ate);
      expect(ready.mealLogs).toEqual([]);
    });
  });
});
