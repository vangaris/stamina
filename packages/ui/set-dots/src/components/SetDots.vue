<script setup lang="ts">
import { computed } from 'vue';
import { SET_DOT_CLASSES } from '../config.ts';
import type { SetDotsProps } from '../types.ts';
import { computeDotStates } from '../utils/compute-dot-states.ts';

/**
 * Set progress for one exercise: a dot per planned set, filled once logged, the set in progress
 * outlined. The row is one image with the caller's `label` as its text alternative.
 */
const props = withDefaults(defineProps<SetDotsProps>(), { current: undefined });

const states = computed(() => computeDotStates(props.total, props.done, props.current));
</script>

<template>
  <div role="img" :aria-label="label" class="flex flex-wrap items-center gap-3 p-1">
    <span
      v-for="(state, index) in states"
      :key="index"
      :data-state="state"
      class="size-3 shrink-0 rounded-pill border transition-colors"
      :class="SET_DOT_CLASSES[state]"
    />
  </div>
</template>
