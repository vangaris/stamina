import { onScopeDispose, ref } from 'vue';
import type { CooldownOptions } from '../types.ts';

/** A countdown in whole seconds. `remaining` is 0 when idle; `start` (re)starts it. */
export function useCooldown({ seconds, tickMs }: CooldownOptions) {
  const remaining = ref(0);
  let timer: ReturnType<typeof setInterval> | undefined;

  function stop() {
    clearInterval(timer);
    timer = undefined;
  }

  function start() {
    stop();
    remaining.value = seconds;
    timer = setInterval(() => {
      remaining.value -= 1;
      if (remaining.value <= 0) stop();
    }, tickMs);
  }

  onScopeDispose(stop);

  return { remaining, start };
}
