<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ReportStopFlagContainer } from '../../stop-flag/index.ts';
import { useCheckin } from '../composables/useCheckin.ts';
import { CHECKIN_QUESTIONS, CHECKIN_SCORES } from '../config.ts';
import { CheckinStatus } from '../enums/checkin-status.ts';
import type { CheckinContainerEmits } from '../types.ts';
import CheckinDone from './CheckinDone.vue';
import CheckinQuestion from './CheckinQuestion.vue';

const emit = defineEmits<CheckinContainerEmits>();
const router = useRouter();
const checkin = useCheckin({ onNavigate: (path) => void router.replace(path) });
const { position, question, selected, sent, messageKey, asking, done, sending, canGoBack } =
  checkin;
const { errorKey, unusualOpen, unusualDone } = checkin;

onMounted(checkin.load);
watch(checkin.status, (now) => {
  if (now === CheckinStatus.Saved) emit('saved');
});
</script>

<template>
  <div>
    <CheckinQuestion
      v-if="asking"
      :question="question"
      :step="position"
      :total="CHECKIN_QUESTIONS.length"
      :scores="CHECKIN_SCORES"
      :selected="selected"
      :can-go-back="canGoBack"
      :sending="sending"
      :error-key="errorKey"
      @answer="checkin.answer"
      @back="checkin.back"
      @retry="checkin.retry"
    />
    <template v-else-if="done && sent">
      <CheckinDone
        :answers="sent"
        :message-key="messageKey"
        :unusual-done="unusualDone"
        @nothing-unusual="checkin.nothingUnusual"
        @something-unusual="checkin.openUnusual"
      />
      <ReportStopFlagContainer v-model:open="unusualOpen" @reported="checkin.reportedUnusual" />
    </template>
  </div>
</template>
