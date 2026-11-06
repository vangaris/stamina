<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { Sheet } from '@stamina/ui-sheet';
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { FieldError } from '../../onboarding/index.ts';
import { useStopFlag } from '../composables/useStopFlag.ts';
import { ReportStatus } from '../enums/report-status.ts';
import { StopFlagStep } from '../enums/stop-flag-step.ts';
import type { ReportStopFlagContainerEmits, ReportStopFlagContainerProps } from '../types.ts';
import { toSheetTitleKey } from '../utils/to-sheet-title-key.ts';
import StopFlagAreaPicker from './StopFlagAreaPicker.vue';
import StopFlagOptions from './StopFlagOptions.vue';
import StopFlagRecheck from './StopFlagRecheck.vue';
import StopOutcome from './StopOutcome.vue';

const props = defineProps<ReportStopFlagContainerProps>();
const emit = defineEmits<ReportStopFlagContainerEmits>();
const open = defineModel<boolean>('open', { required: true });

const { t } = useI18n();
const router = useRouter();
const flow = useStopFlag({
  sessionId: () => props.sessionId,
  onNavigate: (path) => void router.replace(path),
  onDone: () => {
    open.value = false;
    emit('reported');
  },
});
const {
  step,
  outcome,
  questions,
  draft,
  errors,
  errorKey,
  reportStatus,
  reportKey,
  canContinue,
  busy,
} = flow;

const titleKey = computed(() => toSheetTitleKey(step.value, outcome.value?.kind));

// A fresh list each time the sheet opens; closing it after a flag was shown still goes where the flag leads.
watch(open, (isOpen) => (isOpen ? flow.reset() : flow.dismiss()));
</script>

<template>
  <Sheet v-model:open="open" :title="t(titleKey)" :close-label="t('stopFlag.close')">
    <div data-testid="stop-sheet">
      <StopFlagOptions v-if="step === StopFlagStep.Options" @pick="flow.pick" />
      <StopFlagAreaPicker v-else-if="step === StopFlagStep.Area" @pick="flow.pickArea" />
      <div
        v-else-if="step === StopFlagStep.Outcome && outcome"
        class="flex flex-col gap-4 pb-4"
        data-testid="stop-outcome"
      >
        <StopOutcome :outcome="outcome" :show-title="false" />
        <p
          v-if="reportStatus === ReportStatus.Queued && reportKey"
          role="status"
          class="text-sm text-text-muted"
          data-testid="stop-queued"
        >
          {{ t(reportKey) }}
        </p>
        <FieldError
          v-else-if="reportStatus === ReportStatus.Failed && reportKey"
          :message="t(reportKey)"
        />
      </div>
      <div v-else-if="step === StopFlagStep.Recheck" class="flex flex-col gap-4">
        <StopFlagRecheck
          :questions="questions"
          :draft="draft"
          :errors="errors"
          @answer="flow.answer"
          @update:body-areas="flow.setBodyAreas"
        />
        <FieldError :message="errorKey ? t(errorKey) : undefined" />
      </div>
    </div>
    <template #footer>
      <Button
        v-if="step === StopFlagStep.Options"
        :variant="ButtonVariant.Secondary"
        data-testid="stop-cancel"
        @click="open = false"
      >
        {{ t('stopFlag.cancel') }}
      </Button>
      <Button
        v-else-if="step === StopFlagStep.Area"
        :variant="ButtonVariant.Secondary"
        data-testid="stop-back"
        @click="flow.back"
      >
        {{ t('stopFlag.back') }}
      </Button>
      <template v-else-if="step === StopFlagStep.Outcome">
        <Button
          v-if="reportStatus === ReportStatus.Failed"
          data-testid="stop-retry"
          @click="flow.retry"
        >
          {{ t('stopFlag.retry') }}
        </Button>
        <Button
          v-else
          :disabled="!canContinue"
          data-testid="stop-continue"
          @click="flow.continueFromOutcome"
        >
          {{ t('stopFlag.continue') }}
        </Button>
      </template>
      <Button v-else :disabled="busy" data-testid="stop-recheck-submit" @click="flow.submitRecheck">
        {{ t('stopFlag.continue') }}
      </Button>
    </template>
  </Sheet>
</template>
