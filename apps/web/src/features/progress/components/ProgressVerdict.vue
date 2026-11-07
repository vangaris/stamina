<script setup lang="ts">
import { Card, CardElement, CardTone } from '@stamina/ui-card';
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ProgressVerdictProps } from '../types.ts';

defineProps<ProgressVerdictProps>();

const { t } = useI18n();
const headingId = useId();
</script>

<template>
  <Card
    :as="CardElement.Section"
    :tone="CardTone.Accent"
    :labelled-by="headingId"
    data-testid="progress-verdict"
  >
    <div class="flex flex-col gap-1">
      <h2 :id="headingId" class="text-base font-semibold">{{ t('progress.verdict.title') }}</h2>
      <p class="text-base">{{ t(message.key, message.params) }}</p>
    </div>
  </Card>
</template>
