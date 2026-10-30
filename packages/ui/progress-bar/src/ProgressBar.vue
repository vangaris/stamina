<script setup lang="ts">
import { computed, useId } from 'vue';

export type ProgressBarTone = 'accent' | 'load' | 'suggest';
export type ProgressBarSize = 'sm' | 'md';

/**
 * A read-only ratio bar. Out-of-range values are clamped: `aria-valuenow` and the fill never go
 * below `min` or above `max` (over target shows a full bar; say so in `valueText`, e.g. "120 %
 * of target"). A non-finite `value` counts as `min`; an unusable range (non-finite `min`/`max`,
 * or `max <= min`) falls back to 0-100.
 */
const props = withDefaults(
  defineProps<{
    value: number;
    min?: number;
    max?: number;
    /** Accessible name. Always required. */
    label: string;
    /** Human readable value for `aria-valuetext`, e.g. "2 of 3 sessions". */
    valueText?: string;
    tone?: ProgressBarTone;
    size?: ProgressBarSize;
    /** Show `label` as visible text above the bar. */
    showLabel?: boolean;
  }>(),
  { min: 0, max: 100, valueText: '', tone: 'accent', size: 'md', showLabel: false },
);

const labelId = useId();

const range = computed(() => {
  const min = Number.isFinite(props.min) ? props.min : 0;
  return Number.isFinite(props.max) && props.max > min
    ? { min, max: props.max }
    : { min: 0, max: 100 };
});

const now = computed(() => {
  const { min, max } = range.value;
  return Number.isFinite(props.value) ? Math.min(max, Math.max(min, props.value)) : min;
});

const percent = computed(() => {
  const { min, max } = range.value;
  return ((now.value - min) / (max - min)) * 100;
});

const toneClass = { accent: 'bg-accent', load: 'bg-load', suggest: 'bg-suggest' } as const;
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
      :aria-valuemin="range.min"
      :aria-valuemax="range.max"
      :aria-valuenow="now"
      :aria-valuetext="valueText || undefined"
      class="w-full overflow-hidden rounded-pill border border-border-strong bg-surface-sunken"
      :class="size === 'sm' ? 'h-2' : 'h-3'"
    >
      <div
        class="h-full rounded-pill transition-[width]"
        :class="toneClass[tone]"
        :style="{ width: `${percent}%` }"
      />
    </div>
  </div>
</template>
