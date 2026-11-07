<script setup lang="ts">
import { Card, CardElement, CardTone } from '@stamina/ui-card';
import { LoadBars } from '@stamina/ui-load-bars';
import { useId } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ProgressLoadCardProps } from '../types.ts';

defineProps<ProgressLoadCardProps>();

const { t } = useI18n();
const headingId = useId();
</script>

<template>
  <Card
    :as="CardElement.Section"
    :tone="CardTone.Load"
    :labelled-by="headingId"
    data-testid="progress-load"
  >
    <div class="flex flex-col gap-3">
      <h2 :id="headingId" class="text-base font-semibold">{{ t('progress.load.title') }}</h2>
      <LoadBars
        :weeks="weeks"
        :average="average"
        :label="t('progress.load.chart')"
        :average-label="t('progress.load.average')"
        :done-label="t('progress.load.done')"
        :planned-label="t('progress.load.planned')"
        :week-label="t('progress.load.week')"
        :current-label="t('progress.load.current')"
        :locale="locale"
      />
    </div>
  </Card>
</template>
