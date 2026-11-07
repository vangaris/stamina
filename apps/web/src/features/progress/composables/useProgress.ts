import { AppError, AppErrorCode, getProgress, logWeighIn } from '@stamina/app-core';
import type { Progress } from '@stamina/contracts';
import { toLocalDate } from '@stamina/dates';
import { computed, ref, shallowRef } from 'vue';
import { useMediator } from '../../../mediator.ts';
import { LOAD_ERROR_KEYS, ROUTE_WHEN_SIGNED_OUT, WEIGH_IN_ERROR_KEYS } from '../config.ts';
import { ProgressMessageKey } from '../enums/progress-message-key.ts';
import { ProgressStatus } from '../enums/progress-status.ts';
import { WeighInMessageKey } from '../enums/weigh-in-message-key.ts';
import { WeighInStatus } from '../enums/weigh-in-status.ts';
import type { UseProgressOptions } from '../types.ts';
import { parseWeight } from '../utils/parse-weight.ts';
import { toLoadBarsWeeks } from '../utils/to-load-bars-weeks.ts';
import { toMessageKey } from '../../../utils/to-message-key.ts';
import { toVerdictMessage } from '../utils/to-verdict-message.ts';

/**
 * How the week is going: Sessions and Activities done against planned, the weekly Load bars, the
 * server's one-sentence verdict, and the optional weekly weigh-in. The numbers and the verdict come
 * from the server; this only words them. A weigh-in needs a connection and is not kept to send
 * later, and is dated with the person's own today, the day the week's "due" is worked out from.
 * Neither the Progress nor a weight is logged (the pipeline logs no results).
 */
export function useProgress(options: UseProgressOptions) {
  const mediator = options.mediator ?? useMediator();
  const now = options.now ?? (() => new Date());

  const status = ref(ProgressStatus.Loading);
  const messageKey = ref<ProgressMessageKey | undefined>();
  const progress = shallowRef<Progress | undefined>();
  const weight = ref('');
  const weighInStatus = ref(WeighInStatus.Idle);
  const weighInMessageKey = ref<WeighInMessageKey | undefined>();

  const weeks = computed(() =>
    progress.value ? toLoadBarsWeeks(progress.value.weeks, options.locale()) : [],
  );
  const verdict = computed(() =>
    progress.value ? toVerdictMessage(progress.value.verdict, options.locale()) : undefined,
  );
  const weighingIn = computed(() => weighInStatus.value === WeighInStatus.Saving);

  function leaveIfSignedOut(error: unknown): boolean {
    if (!(error instanceof AppError && error.code === AppErrorCode.Unauthorized)) return false;
    options.onNavigate(ROUTE_WHEN_SIGNED_OUT);
    return true;
  }

  async function load() {
    status.value = ProgressStatus.Loading;
    messageKey.value = undefined;
    try {
      progress.value = await mediator.send(getProgress());
      status.value = ProgressStatus.Ready;
    } catch (error) {
      if (leaveIfSignedOut(error)) return;
      messageKey.value = toMessageKey(error, LOAD_ERROR_KEYS, ProgressMessageKey.Failed);
      status.value = ProgressStatus.Failed;
    }
  }

  async function submitWeighIn() {
    if (weighingIn.value || !progress.value) return;
    const weightKg = parseWeight(weight.value);
    if (weightKg === undefined) {
      weighInMessageKey.value = WeighInMessageKey.Invalid;
      weighInStatus.value = WeighInStatus.Failed;
      return;
    }
    weighInStatus.value = WeighInStatus.Saving;
    weighInMessageKey.value = undefined;
    try {
      const saved = await mediator.send(logWeighIn({ weightKg, date: toLocalDate(now()) }));
      progress.value = { ...progress.value, weighIn: { latest: saved, due: false } };
      weight.value = '';
      weighInMessageKey.value = WeighInMessageKey.Saved;
      weighInStatus.value = WeighInStatus.Saved;
    } catch (error) {
      if (leaveIfSignedOut(error)) return;
      weighInMessageKey.value = toMessageKey(error, WEIGH_IN_ERROR_KEYS, WeighInMessageKey.Failed);
      weighInStatus.value = WeighInStatus.Failed;
    }
  }

  return {
    status,
    messageKey,
    progress,
    weeks,
    verdict,
    weight,
    weighInStatus,
    weighInMessageKey,
    weighingIn,
    load,
    submitWeighIn,
  };
}
