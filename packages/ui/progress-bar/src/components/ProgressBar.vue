<script setup lang="ts">
import { computed, useId } from 'vue';
import { PROGRESS_BAR_SIZE_CLASSES, PROGRESS_BAR_TONE_CLASSES } from '../config.ts';
import type { ProgressBarProps } from '../types.ts';
import { computeProgress } from '../utils/compute-progress.ts';

/**
 * A read-only ratio bar. Out-of-range values are clamped: `aria-valuenow` and the fill never go
 * below `min` or above `max` (over target shows a full bar; say so in `valueText`, e.g. "120 %
 * of target"). A non-finite `value` counts as `min`; an unusable range (non-finite `min`/`max`,
 * or `max <= min`) falls back to 0-100.
 */
const props = withDefaults(defineProps<ProgressBarProps>(), {
  min: 0,
  max: 100,
  valueText: '',
  tone: 'accent',
  size: 'md',
  showLabel: false,
});

const labelId = useId();

const metrics = computed(() => computeProgress(props.value, props.min, props.max));
</script>

<template>
  <div class="flex w-full flex-col gap-1">
    <div v-if="showLabel || $slots.caption" class="flex items-baseline justify-between gap-3">
      <span v-if="showLabel" :id="labelId" class="text-sm font-medium text-text">{{ label }}</span>
      <span v-if="$slots.caption" class="ms-auto text-sm text-text-muted"
        ><slot name="caption"
      /></span>
    </div>
    <div
      role="progressbar"
      :aria-label="showLabel ? undefined : label"
      :aria-labelledby="showLabel ? labelId : undefined"
      :aria-valuemin="metrics.min"
      :aria-valuemax="metrics.max"
      :aria-valuenow="metrics.now"
      :aria-valuetext="valueText || undefined"
      class="w-full overflow-hidden rounded-pill border border-border-strong bg-surface-sunken"
      :class="PROGRESS_BAR_SIZE_CLASSES[size]"
    >
      <div
        class="h-full rounded-pill transition-[width]"
        :class="PROGRESS_BAR_TONE_CLASSES[tone]"
        :style="{ width: `${metrics.percent}%` }"
      />
    </div>
  </div>
</template>
