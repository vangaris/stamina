<script setup lang="ts">
import { computed } from 'vue';

export type CardTone = 'default' | 'accent' | 'load' | 'suggest' | 'danger';
export type CardPadding = 'md' | 'lg';
export type CardElement = 'div' | 'section' | 'article' | 'li';

const props = withDefaults(
  defineProps<{
    /** Root element. */
    as?: CardElement;
    tone?: CardTone;
    padding?: CardPadding;
    /** Id of the heading (in the caller's markup) that names a `section` / `article` card. */
    labelledBy?: string | undefined;
  }>(),
  { as: 'div', tone: 'default', padding: 'md', labelledBy: undefined },
);

// Tones carry a thick left border in the tone colour, so the tone is not colour alone.
const toneClass = computed(() => {
  switch (props.tone) {
    case 'accent':
      return 'border-border border-l-4 border-l-accent bg-accent-soft text-on-accent-soft';
    case 'load':
      return 'border-border border-l-4 border-l-load bg-load-soft text-on-load-soft';
    case 'suggest':
      return 'border-border border-l-4 border-l-suggest bg-suggest-soft text-on-suggest-soft';
    case 'danger':
      return 'border-border border-l-4 border-l-danger bg-danger-soft text-on-danger-soft';
    default:
      return 'border-border bg-surface text-text';
  }
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
    :class="[toneClass, padding === 'lg' ? 'p-6' : 'p-4']"
  >
    <div v-if="$slots.header"><slot name="header" /></div>
    <div v-if="$slots.default"><slot /></div>
    <div v-if="$slots.footer"><slot name="footer" /></div>
  </component>
</template>
