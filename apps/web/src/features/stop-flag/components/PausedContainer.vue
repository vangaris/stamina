<script setup lang="ts">
import { Button } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { computed, nextTick, onMounted, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { FieldError } from '../../onboarding/index.ts';
import { SafetyGate, SafetyPhase } from '../../safety/index.ts';
import { usePaused } from '../composables/usePaused.ts';
import StopOutcome from './StopOutcome.vue';

const { t } = useI18n();
const router = useRouter();
const { phase, outcomes, errorKey, busy, load, confirm } = usePaused({
  onNavigate: (path) => void router.replace(path),
});

const headingId = useId();
const heading = ref<HTMLElement | null>(null);
const error = computed(() => (errorKey.value ? t(errorKey.value) : undefined));

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
      <StopOutcome
        v-for="outcome in outcomes"
        :key="outcome.kind"
        :outcome="outcome"
        :show-title="false"
      />
      <div class="flex flex-col gap-2">
        <Button block :disabled="busy" data-testid="paused-confirm" @click="confirm">
          {{ t('stopFlag.paused.confirm') }}
        </Button>
        <p class="text-sm text-text-muted">{{ t('stopFlag.paused.hint') }}</p>
      </div>
      <FieldError :message="error" />
    </div>
  </Card>
  <SafetyGate v-else :phase="phase" @retry="load" />
</template>
