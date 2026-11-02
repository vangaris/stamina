<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { Card, CardElement } from '@stamina/ui-card';
import { onMounted, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { STOP_MESSAGES } from '../config.ts';
import type { StopNoticeEmits, StopNoticeProps } from '../types.ts';

defineProps<StopNoticeProps>();
const emit = defineEmits<StopNoticeEmits>();

const { t } = useI18n();
const headingId = useId();
const heading = ref<HTMLElement | null>(null);

onMounted(() => heading.value?.focus());
</script>

<template>
  <Card :as="CardElement.Section" :labelled-by="headingId">
    <div class="flex flex-col gap-4">
      <h1 :id="headingId" ref="heading" tabindex="-1" class="text-xl font-semibold outline-none">
        {{ t(STOP_MESSAGES[reason].title) }}
      </h1>
      <p class="text-base text-text">{{ t(STOP_MESSAGES[reason].body) }}</p>
      <Button :variant="ButtonVariant.Secondary" block @click="emit('change')">
        {{ t('onboarding.stop.change') }}
      </Button>
    </div>
  </Card>
</template>
