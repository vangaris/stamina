<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { RestTimer } from '@stamina/ui-rest-timer';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { RoutePath } from '../../../enums/route-path.ts';
import { i18n } from '../../../i18n.ts';
import { ReportStopFlagContainer, RestNoticeContainer } from '../../stop-flag/index.ts';
import { REST_ADD_SECONDS } from '../config.ts';
import { useSession } from '../composables/useSession.ts';
import { SessionPhase } from '../enums/session-phase.ts';
import { SessionSheet } from '../enums/session-sheet.ts';
import type { SessionContainerProps } from '../types.ts';
import { hasStopButton } from '../utils/has-stop-button.ts';
import { toRestAnnouncement } from '../utils/to-rest-announcement.ts';
import ConfirmFinishSheet from './ConfirmFinishSheet.vue';
import DoneView from './DoneView.vue';
import FinishView from './FinishView.vue';
import FocusView from './FocusView.vue';
import OverviewView from './OverviewView.vue';
import SessionGate from './SessionGate.vue';
import SwapSheet from './SwapSheet.vue';

const props = defineProps<SessionContainerProps>();

const { t } = useI18n();
const { locale } = i18n.global;
const router = useRouter();
const session = useSession({
  sessionId: props.sessionId,
  locale: () => locale.value,
  onNavigate: (path) => void router.replace(path),
});
const {
  phase,
  messageKey,
  errorKey,
  focus,
  draft,
  setStatus,
  overview,
  swapOptions,
  sheet,
  setsLeft,
  restView,
  finishRpe,
  finishMinutes,
  finished,
  submitting,
} = session;

const swapOpen = computed({
  get: () => sheet.value === SessionSheet.Swap,
  set: (open) => (open ? session.openSwap() : session.closeSheet()),
});
const confirmOpen = computed({
  get: () => sheet.value === SessionSheet.ConfirmFinish,
  set: (open) => {
    if (!open) session.closeSheet();
  },
});

const showStop = computed(() => hasStopButton(phase.value));
const stopOpen = ref(false);

function announceRest(seconds: number) {
  const { key, params } = toRestAnnouncement(seconds);
  return t(key, params);
}

onMounted(session.load);
onBeforeUnmount(session.close);
</script>

<template>
  <div class="flex flex-col gap-4">
    <RestNoticeContainer />
    <div v-if="showStop" class="flex justify-end">
      <Button :variant="ButtonVariant.Danger" data-testid="stop-open" @click="stopOpen = true">
        {{ t('stopFlag.stop') }}
      </Button>
    </div>
    <ReportStopFlagContainer v-model:open="stopOpen" :session-id="sessionId" />
    <SessionGate
      v-if="phase === SessionPhase.Loading || phase === SessionPhase.Failed"
      :phase="phase"
      :message-key="messageKey"
      @retry="session.load"
      @leave="router.push(RoutePath.Week)"
    />
    <template v-else-if="phase === SessionPhase.Focus && focus">
      <FocusView
        v-model:weight-kg="draft.weightKg"
        v-model:reps="draft.reps"
        v-model:rpe="draft.rpe"
        :focus="focus"
        :status="setStatus"
        :error-key="errorKey"
        :locale="locale"
        @done="session.logCurrentSet"
        @add-set="session.addSet"
        @next="session.nextExercise"
        @finish="session.requestFinish"
        @overview="session.showOverview"
        @swap="session.openSwap"
      />
      <SwapSheet v-model:open="swapOpen" :options="swapOptions" @choose="session.swapTo" />
      <RestTimer
        v-if="restView"
        :remaining-seconds="restView.remainingSeconds"
        :total-seconds="restView.totalSeconds"
        :label="t('session.rest.title')"
        :skip-label="t('session.rest.skip')"
        :add-label="t('session.rest.add', { seconds: REST_ADD_SECONDS })"
        :next-label="
          restView.next
            ? t('session.rest.next', { name: restView.next.name, set: restView.next.setNumber })
            : undefined
        "
        :announce="announceRest"
        @skip="session.skipRest"
        @add="session.addRestTime"
      />
    </template>
    <template v-else-if="phase === SessionPhase.Overview">
      <OverviewView
        :rows="overview"
        @select="session.jumpTo"
        @back="session.showFocus"
        @finish="session.requestFinish"
      />
    </template>
    <FinishView
      v-else-if="phase === SessionPhase.Finish"
      v-model:rpe="finishRpe"
      v-model:minutes="finishMinutes"
      :submitting="submitting"
      :error-key="errorKey"
      @submit="session.submitFinish"
      @back="session.showFocus"
    />
    <DoneView
      v-else-if="phase === SessionPhase.Done && finished"
      :finished="finished"
      @today="router.push(RoutePath.Today)"
      @week="router.push(RoutePath.Week)"
    />
    <ConfirmFinishSheet
      v-if="phase === SessionPhase.Focus || phase === SessionPhase.Overview"
      v-model:open="confirmOpen"
      :left="setsLeft"
      @confirm="session.showFinish"
    />
  </div>
</template>
