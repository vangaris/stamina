import { SessionStatus, type SessionState } from '@stamina/app-core';
import { defineStore } from 'pinia';
import { ref } from 'vue';

/** State only: the sign-in and `getSession` handlers write here, screens and guards read. */
export const useSessionStore = defineStore('session', () => {
  const state = ref<SessionState>({ status: SessionStatus.Unknown });
  function set(next: SessionState) {
    state.value = next;
  }
  return { state, set };
});
