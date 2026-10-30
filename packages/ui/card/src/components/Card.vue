<script setup lang="ts">
import { computed } from 'vue';
import { CARD_PADDING_CLASSES, CARD_TONE_CLASSES } from '../config.ts';
import type { CardProps } from '../types.ts';

const props = withDefaults(defineProps<CardProps>(), {
  as: 'div',
  tone: 'default',
  padding: 'md',
  labelledBy: undefined,
});

const labelled = computed(() =>
  (props.as === 'section' || props.as === 'article') && props.labelledBy
    ? { 'aria-labelledby': props.labelledBy }
    : {},
);
</script>

<template>
  <component
    :is="as"
    v-bind="labelled"
    class="flex flex-col gap-3 rounded-lg border text-base"
    :class="[CARD_TONE_CLASSES[tone], CARD_PADDING_CLASSES[padding]]"
  >
    <div v-if="$slots.header"><slot name="header" /></div>
    <div v-if="$slots.default"><slot /></div>
    <div v-if="$slots.footer"><slot name="footer" /></div>
  </component>
</template>
