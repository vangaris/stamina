<script setup lang="ts">
import { Button, ButtonType, ButtonVariant } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { ProgressBar } from '@stamina/ui-progress-bar';
import { computed, onMounted, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import type { StepFrameEmits, StepFrameProps } from '../types.ts';
import FieldError from './FieldError.vue';

const props = defineProps<StepFrameProps>();
const emit = defineEmits<StepFrameEmits>();

const { t } = useI18n();
const headingId = useId();
const heading = ref<HTMLElement | null>(null);

const isLast = computed(() => props.stepNumber === props.stepCount);
const stepText = computed(() =>
  t('onboarding.progress.step', { step: props.stepNumber, total: props.stepCount }),
);
const error = computed(() => (props.errorKey ? t(props.errorKey) : undefined));

// A new screen replaced the old one: move the keyboard and the screen reader to its heading.
onMounted(() => heading.value?.focus());
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId">
    <form class="flex flex-col gap-6" novalidate @submit.prevent="emit('next')">
      <div class="flex flex-col gap-3">
        <ProgressBar
          :value="stepNumber"
          :max="stepCount"
          :label="t('onboarding.progress.label')"
          :value-text="stepText"
        >
          <template #caption>{{ stepText }}</template>
        </ProgressBar>
        <h1 :id="headingId" ref="heading" tabindex="-1" class="text-xl font-semibold outline-none">
          {{ title }}
        </h1>
      </div>
      <slot />
      <FieldError :message="error" />
      <div class="flex flex-col gap-2">
        <Button :type="ButtonType.Submit" :disabled="busy" block>
          {{ isLast ? t('onboarding.actions.finish') : t('onboarding.actions.next') }}
        </Button>
        <Button
          v-if="stepNumber > 1"
          :variant="ButtonVariant.Ghost"
          :disabled="busy"
          block
          @click="emit('back')"
        >
          {{ t('onboarding.actions.back') }}
        </Button>
      </div>
    </form>
  </Card>
</template>
