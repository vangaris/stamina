import { ref } from 'vue';
import { MS_PER_SECOND, REST_TICK_MS } from '../config.ts';
import type { UseRestTimerOptions } from '../types.ts';
import { createBrowserClock } from '../utils/create-browser-clock.ts';

/**
 * The rest countdown. It keeps the moment the rest ends and reads the clock on every tick, so a
 * phone that slept (or a throttled background tab) shows the right time on return instead of
 * falling behind. `onEnd` runs once per rest, when it runs out or is skipped.
 */
export function useRestTimer({ onEnd, clock = createBrowserClock() }: UseRestTimerOptions) {
  const remaining = ref(0);
  const total = ref(0);
  const active = ref(false);
  let endsAt = 0;
  let stopTicking: (() => void) | undefined;

  const secondsLeft = () => Math.max(0, Math.ceil((endsAt - clock.now()) / MS_PER_SECOND));

  /** Stops the countdown without calling `onEnd`. */
  function stop() {
    stopTicking?.();
    stopTicking = undefined;
    active.value = false;
  }

  function finish() {
    stop();
    onEnd();
  }

  function tick() {
    remaining.value = secondsLeft();
    if (remaining.value === 0) finish();
  }

  function start(seconds: number) {
    stop();
    total.value = seconds;
    remaining.value = seconds;
    endsAt = clock.now() + seconds * MS_PER_SECOND;
    active.value = true;
    stopTicking = clock.every(tick, REST_TICK_MS);
  }

  function add(seconds: number) {
    if (!active.value) return;
    endsAt += seconds * MS_PER_SECOND;
    remaining.value = secondsLeft();
    total.value = Math.max(total.value, remaining.value);
  }

  function skip() {
    if (active.value) finish();
  }

  return { remaining, total, active, start, add, skip, stop };
}
