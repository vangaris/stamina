import { SafetyStatus, getSafety } from '@stamina/app-core';
import { toLocalDate } from '@stamina/dates';
import { isTrainingBlocked } from '@stamina/domain';
import { ref } from 'vue';
import { useMediator } from '../../../mediator.ts';
import type { UseRestNoticeOptions } from '../types.ts';

/**
 * Whether to tell the person today is a rest day: a person ready to train whom the domain says is
 * blocked today, which only a fever reported today does. Asking works with no signal. When the
 * answer cannot be had the notice stays away: the paused screen and the safety guard carry the
 * rules, this is only a reminder.
 */
export function useRestNotice(options: UseRestNoticeOptions = {}) {
  const mediator = options.mediator ?? useMediator();
  const now = options.now ?? (() => new Date());

  const visible = ref(false);

  async function load() {
    try {
      const state = await mediator.send(getSafety());
      visible.value =
        state.status === SafetyStatus.Ready && isTrainingBlocked(state.stop, toLocalDate(now()));
    } catch {
      visible.value = false;
    }
  }

  return { visible, load };
}
