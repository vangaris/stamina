import { ProfileStatus, type ProfileState } from '@stamina/app-core';
import { defineStore } from 'pinia';
import { ref } from 'vue';

/** State only: the `getProfile` and `saveProfile` handlers write here, screens and guards read. */
export const useProfileStore = defineStore('profile', () => {
  const state = ref<ProfileState>({ status: ProfileStatus.Unknown });
  function set(next: ProfileState) {
    state.value = next;
  }
  return { state, set };
});
