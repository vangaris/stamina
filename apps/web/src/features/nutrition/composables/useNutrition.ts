import {
  AppError,
  AppErrorCode,
  getNutrition,
  logWater,
} from '@stamina/app-core';
import { NutritionStatus, type NutritionState } from '@stamina/contracts';
import { toLocalDate } from '@stamina/dates';
import type { WaterAmount } from '@stamina/domain';
import { newId } from '@stamina/ids';
import { ref, shallowRef } from 'vue';
import { useMediator } from '../../../mediator.ts';
import { toMessageKey } from '../../../utils/to-message-key.ts';
import { LOAD_ERROR_KEYS, ROUTE_WHEN_SIGNED_OUT } from '../config.ts';
import { NutritionLoadStatus } from '../enums/nutrition-load-status.ts';
import { NutritionMessageKey } from '../enums/nutrition-message-key.ts';
import { WaterMessageKey } from '../enums/water-message-key.ts';
import type { UseNutritionOptions } from '../types.ts';

/**
 * The day's nutrition, as the server worked it out: whether Meals is locked, off or ready, and
 * when ready the targets, the water so far and the meal slots. Read again after the setup is
 * saved or water is logged. Water is logged with an id made here, so a replay cannot count twice;
 * offline the log is kept on the phone and the day still shows it. Nothing about the person's
 * body or food is logged.
 */
export function useNutrition(options: UseNutritionOptions) {
  const mediator = options.mediator ?? useMediator();
  const now = options.now ?? (() => new Date());
  const makeId = options.newId ?? newId;

  const status = ref(NutritionLoadStatus.Loading);
  const messageKey = ref<NutritionMessageKey | undefined>();
  const waterMessageKey = ref<WaterMessageKey | undefined>();
  const nutrition = shallowRef<NutritionState | undefined>();

  function leaveIfSignedOut(error: unknown): boolean {
    if (!(error instanceof AppError && error.code === AppErrorCode.Unauthorized)) return false;
    options.onNavigate(ROUTE_WHEN_SIGNED_OUT);
    return true;
  }

  /** Reads the day. Once something is shown, a read that fails leaves it as it is. */
  async function load() {
    messageKey.value = undefined;
    if (!nutrition.value) status.value = NutritionLoadStatus.Loading;
    try {
      nutrition.value = await mediator.send(getNutrition(toLocalDate(now())));
      status.value = NutritionLoadStatus.Ready;
    } catch (error) {
      if (leaveIfSignedOut(error)) return;
      if (nutrition.value) return;
      messageKey.value = toMessageKey(error, LOAD_ERROR_KEYS, NutritionMessageKey.Failed);
      status.value = NutritionLoadStatus.Failed;
    }
  }

  /** Adds a quick-log amount to today's water, shown at once and read again from the server. */
  async function addWater(amount: WaterAmount) {
    const current = nutrition.value;
    if (current?.status !== NutritionStatus.Ready) return;
    waterMessageKey.value = undefined;
    try {
      await mediator.send(logWater({ id: makeId(), ml: amount, date: toLocalDate(now()) }));
    } catch (error) {
      if (leaveIfSignedOut(error)) return;
      waterMessageKey.value = WaterMessageKey.Failed;
      return;
    }
    nutrition.value = { ...current, water: { ...current.water, ml: current.water.ml + amount } };
    await load();
  }

  return { status, messageKey, waterMessageKey, nutrition, load, addWater };
}
