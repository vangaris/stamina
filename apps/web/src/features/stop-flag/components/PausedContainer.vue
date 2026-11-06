<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { computed, nextTick, onMounted, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { FieldError } from '../../onboarding/index.ts';
import { SafetyGate, SafetyPhase } from '../../safety/index.ts';
import { usePaused } from '../composables/usePaused.ts';
import { PausedStep } from '../enums/paused-step.ts';
import StopFlagRecheck from './StopFlagRecheck.vue';
import StopOutcome from './StopOutcome.vue';

const { t } = useI18n();
const router = useRouter();
const flow = usePaused({
  onNavigate: (path) => void router.replace(path),
});
const {
  phase,
  step,
  outcomes,
  confirmCopy,
  errorKey,
  busy,
  questions,
  draft,
  errors,
  recheckErrorKey,
  recheckBusy,
  load,
  confirm,
} = flow;

const headingId = useId();
const heading = ref<HTMLElement | null>(null);
const error = computed(() => (errorKey.value ? t(errorKey.value) : undefined));
const recheckError = computed(() => (recheckErrorKey.value ? t(recheckErrorKey.value) : undefined));

onMounted(async () => {
  await load();
  await nextTick();
  // The page replaced another: move the keyboard and the screen reader to its heading.
  heading.value?.focus();
});
</script>

<template>
  <Card
    v-if="phase === SafetyPhase.Ready"
    :as="CardElement.Section"
    :labelled-by="headingId"
    data-testid="paused"
  >
    <div class="flex flex-col gap-6">
      <h1 :id="headingId" ref="heading" tabindex="-1" class="text-xl font-semibold outline-none">
        {{ t('stopFlag.paused.title') }}
      </h1>
      <template v-if="step === PausedStep.Confirm">
        <StopOutcome
          v-for="outcome in outcomes"
          :key="outcome.kind"
          :outcome="outcome"
          :show-title="false"
        />
        <div class="flex flex-col gap-2">
          <Button block :disabled="busy" data-testid="paused-confirm" @click="confirm">
            {{ t(confirmCopy.label) }}
          </Button>
          <p class="text-sm text-text-muted">{{ t(confirmCopy.hint) }}</p>
        </div>
        <FieldError :message="error" />
      </template>
      <template v-else>
        <StopFlagRecheck
          :questions="questions"
          :draft="draft"
          :errors="errors"
          @answer="flow.answer"
          @update:body-areas="flow.setBodyAreas"
        />
        <FieldError :message="recheckError" />
        <Button
          block
          :disabled="recheckBusy"
          data-testid="paused-recheck-submit"
          @click="flow.submitRecheck"
        >
          {{ t('stopFlag.continue') }}
        </Button>
      </template>
    </div>
  </Card>
  <SafetyGate v-else :phase="phase" @retry="load" />
</template>
