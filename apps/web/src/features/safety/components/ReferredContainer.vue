<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useReferred } from '../composables/useReferred.ts';
import { ReferredView } from '../enums/referred-view.ts';
import { SafetyPhase } from '../enums/safety-phase.ts';
import DeleteConfirm from './DeleteConfirm.vue';
import LimitedNotice from './LimitedNotice.vue';
import ReferredNotice from './ReferredNotice.vue';
import SafetyGate from './SafetyGate.vue';

const router = useRouter();
const {
  phase,
  view,
  isPregnancy,
  errorKey,
  exported,
  busy,
  load,
  exportMyData,
  askToDelete,
  keepData,
  confirmDelete,
  stateDoctorOk,
  signOut,
  continueToToday,
} = useReferred({ onNavigate: (path) => void router.replace(path) });

onMounted(load);
</script>

<template>
  <template v-if="phase === SafetyPhase.Ready">
    <LimitedNotice v-if="view === ReferredView.Limited" @continue="continueToToday" />
    <DeleteConfirm
      v-else-if="view === ReferredView.ConfirmDelete"
      :busy="busy"
      :error-key="errorKey"
      @confirm="confirmDelete"
      @cancel="keepData"
    />
    <ReferredNotice
      v-else
      :is-pregnancy="isPregnancy"
      :exported="exported"
      :busy="busy"
      :error-key="errorKey"
      @export="exportMyData"
      @delete="askToDelete"
      @doctor-ok="stateDoctorOk"
      @sign-out="signOut"
    />
  </template>
  <SafetyGate v-else :phase="phase" @retry="load" />
</template>
