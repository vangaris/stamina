<script setup lang="ts">
import { ProgressBar, ProgressBarTone } from '@stamina/ui-progress-bar';
import { useI18n } from 'vue-i18n';
import type { TimelineWaterEntryProps } from '../types.ts';

defineProps<TimelineWaterEntryProps>();

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-1 flex-col gap-2 rounded-md border border-border px-3 py-2">
    <ProgressBar
      :value="water.ml"
      :max="water.targetMl"
      :label="t('today.water.title')"
      :value-text="t('today.water.progress', { ml: water.ml, target: water.targetMl })"
      :tone="ProgressBarTone.Accent"
      show-label
      data-testid="water-bar"
    />
    <p class="text-sm text-text-muted">
      {{ t('today.water.progress', { ml: water.ml, target: water.targetMl }) }}
    </p>
  </div>
</template>
