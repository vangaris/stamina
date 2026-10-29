import type { HealthState } from '@stamina/app-core';
import { defineStore } from 'pinia';
import { ref } from 'vue';

/** State only: the `getHealth` handler writes here, components read. */
export const useHealthStore = defineStore('health', () => {
  const state = ref<HealthState | { kind: 'unknown' }>({ kind: 'unknown' });
  function set(next: HealthState) {
    state.value = next;
  }
  return { state, set };
});
