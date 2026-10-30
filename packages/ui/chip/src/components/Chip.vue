<script setup lang="ts">
import { computed } from 'vue';
import { CHIP_SELECTED_CLASSES, CHIP_UNSELECTED_CLASSES } from '../config.ts';
import type { ChipProps } from '../types.ts';

const props = withDefaults(defineProps<ChipProps>(), {
  selected: false,
  mode: 'toggle',
  disabled: false,
});

const aria = computed(() =>
  props.mode === 'toggle'
    ? { 'aria-pressed': props.selected }
    : { role: props.mode === 'radio' ? 'radio' : 'checkbox', 'aria-checked': props.selected },
);
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    v-bind="aria"
    class="inline-flex min-h-tap min-w-tap items-center justify-center gap-1 rounded-pill border-2 px-4 text-sm font-medium transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50"
    :class="selected ? CHIP_SELECTED_CLASSES : CHIP_UNSELECTED_CLASSES"
  >
    <!-- Selection is not shown by colour alone. -->
    <svg
      v-if="selected"
      aria-hidden="true"
      viewBox="0 0 16 16"
      class="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M3 8.5l3.5 3.5L13 4.5" />
    </svg>
    <slot />
  </button>
</template>
