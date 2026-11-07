<script setup lang="ts">
import { Button, ButtonVariant } from '@stamina/ui-button';
import { ProgressBar, ProgressBarTone } from '@stamina/ui-progress-bar';
import { useI18n } from 'vue-i18n';
import { WATER_AMOUNTS } from '../../nutrition/index.ts';
import type { TimelineWaterEntryEmits, TimelineWaterEntryProps } from '../types.ts';

defineProps<TimelineWaterEntryProps>();
const emit = defineEmits<TimelineWaterEntryEmits>();

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
    <p role="status" aria-live="polite" class="text-sm text-text-muted">
      {{ t('today.water.progress', { ml: water.ml, target: water.targetMl }) }}
    </p>
    <div class="flex gap-2">
      <Button
        v-for="amount in WATER_AMOUNTS"
        :key="amount"
        :variant="ButtonVariant.Secondary"
        :aria-label="t('meals.water.addLabel', { ml: amount })"
        :data-testid="`today-water-add-${amount}`"
        @click="emit('log', amount)"
      >
        {{ t('meals.water.add', { ml: amount }) }}
      </Button>
    </div>
  </div>
</template>
