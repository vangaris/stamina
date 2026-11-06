import { ref, watch } from 'vue';
import type { RestTimerAnnounce } from '../types.ts';
import { shouldAnnounce } from '../utils/should-announce.ts';

/**
 * The text for a polite live region that follows the countdown without chattering: it changes
 * only at the moments `shouldAnnounce` picks (the first value included), and keeps its last text
 * in between so nothing is re-read.
 */
export function useAnnouncement(remaining: () => number, announce: () => RestTimerAnnounce) {
  const initial = remaining();
  const text = ref(shouldAnnounce(initial) ? announce()(initial) : '');
  watch(remaining, (now, before) => {
    if (shouldAnnounce(now, before)) text.value = announce()(now);
  });
  return text;
}
