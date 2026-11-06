<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { Chip, ChipMode } from '@stamina/ui-chip';
import { ProgressBar } from '@stamina/ui-progress-bar';
import { nextTick, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CheckinQuestionEmits, CheckinQuestionProps } from '../types.ts';

const props = defineProps<CheckinQuestionProps>();
const emit = defineEmits<CheckinQuestionEmits>();

const { t } = useI18n();
const headingId = useId();
const endsId = useId();
const heading = ref<HTMLElement | null>(null);

// A new question replaced the old one: move the keyboard and the screen reader to it.
watch(
  () => props.question,
  async () => {
    await nextTick();
    heading.value?.focus();
  },
);
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId" data-testid="checkin-question">
    <div class="flex flex-col gap-4">
      <ProgressBar
        :value="step"
        :min="0"
        :max="total"
        :label="t('checkin.progress.label')"
        :value-text="t('checkin.progress.value', { step, total })"
      >
        <template #caption>{{ t('checkin.progress.value', { step, total }) }}</template>
      </ProgressBar>
      <h2
        :id="headingId"
        ref="heading"
        tabindex="-1"
        class="text-xl font-semibold outline-none"
        data-testid="checkin-heading"
      >
        {{ t(`checkin.${question}.question`) }}
      </h2>
      <div
        role="radiogroup"
        :aria-labelledby="headingId"
        :aria-describedby="endsId"
        class="flex gap-2"
      >
        <Chip
          v-for="score in scores"
          :key="score"
          :mode="ChipMode.Radio"
          :selected="selected === score"
          :disabled="sending"
          class="min-h-16! flex-1 text-xl"
          :data-testid="`checkin-score-${score}`"
          @click="emit('answer', score)"
        >
          {{ score }}
        </Chip>
      </div>
      <p :id="endsId" class="flex justify-between gap-4 text-sm text-text-muted">
        <span>{{ t(`checkin.${question}.low`) }}</span>
        <span class="text-end">{{ t(`checkin.${question}.high`) }}</span>
      </p>
      <p v-if="errorKey" role="alert" class="text-sm text-danger" data-testid="checkin-error">
        {{ t(errorKey) }}
      </p>
    </div>
    <template v-if="canGoBack || errorKey" #footer>
      <div class="flex gap-2">
        <Button
          v-if="canGoBack"
          :variant="ButtonVariant.Secondary"
          data-testid="checkin-back"
          @click="emit('back')"
        >
          {{ t('checkin.back') }}
        </Button>
        <Button v-if="errorKey" data-testid="checkin-retry" @click="emit('retry')">
          {{ t('checkin.retry') }}
        </Button>
      </div>
    </template>
  </Card>
</template>
