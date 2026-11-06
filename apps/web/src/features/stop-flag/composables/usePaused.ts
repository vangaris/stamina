import { AppError, AppErrorCode, SafetyStatus, confirmDoctorSeen } from '@stamina/app-core';
import { computed, ref } from 'vue';
import { toMessageKey } from '../../../utils/to-message-key.ts';
import { useSafetyRoute } from '../../safety/index.ts';
import { PAUSED_ERROR_KEYS, ROUTE_WHEN_SIGNED_OUT } from '../config.ts';
import { StopFlagMessageKey } from '../enums/stop-flag-message-key.ts';
import type { UsePausedOptions } from '../types.ts';
import { toPausedOutcomes } from '../utils/to-paused-outcomes.ts';

/**
 * The paused screen: what pauses training, in the words of the stop flags, and the one way back,
 * "A doctor has seen me". Confirming ends every pause on the server, then asks where the person
 * stands again and goes there (Today when nothing else is in the way). Confirming needs the
 * server, and refuses while a report is still waiting on this phone to be sent. A person who is
 * not paused leaves for the screen they belong on. Never logs what it shows.
 */
export function usePaused(options: UsePausedOptions) {
  const route = useSafetyRoute(SafetyStatus.Paused, options);

  const errorKey = ref<StopFlagMessageKey | undefined>();
  const busy = ref(false);

  const outcomes = computed(() =>
    route.state.value?.status === SafetyStatus.Paused
      ? toPausedOutcomes(route.state.value.stop.pausing)
      : [],
  );

  async function confirm() {
    if (busy.value) return;
    busy.value = true;
    errorKey.value = undefined;
    try {
      await route.mediator.send(confirmDoctorSeen());
      // Leaves for the screen the person belongs on now; stays (and refreshes) if still paused.
      await route.load();
    } catch (error) {
      if (error instanceof AppError && error.code === AppErrorCode.Unauthorized) {
        return options.onNavigate(ROUTE_WHEN_SIGNED_OUT);
      }
      errorKey.value = toMessageKey(error, PAUSED_ERROR_KEYS, StopFlagMessageKey.PausedUnknown);
    } finally {
      busy.value = false;
    }
  }

  return { phase: route.phase, outcomes, errorKey, busy, load: route.load, confirm };
}
