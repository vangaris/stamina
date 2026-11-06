import { getSafety } from '@stamina/app-core';
import { toLocalDate } from '@stamina/dates';
import { ref } from 'vue';
import { useMediator } from '../../../mediator.ts';
import type { UseRestNoticeOptions } from '../types.ts';
import { isRestDay } from '../utils/is-rest-day.ts';

/**
 * Whether to tell the person today is a rest day (a fever was reported today). Asking works with
 * no signal. When the answer cannot be had the notice stays away: the paused screen and the
 * safety guard carry the rules, this is only a reminder.
 */
export function useRestNotice(options: UseRestNoticeOptions = {}) {
  const mediator = options.mediator ?? useMediator();
  const now = options.now ?? (() => new Date());

  const visible = ref(false);

  async function load() {
    try {
      visible.value = isRestDay(await mediator.send(getSafety()), toLocalDate(now()));
    } catch {
      visible.value = false;
    }
  }

  return { visible, load };
}
