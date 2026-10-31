<script setup lang="ts">
import { computed } from 'vue';
import { CARD_PADDING_CLASSES, CARD_TONE_CLASSES } from '../config.ts';
import { CardElement } from '../enums/card-element.ts';
import { CardPadding } from '../enums/card-padding.ts';
import { CardTone } from '../enums/card-tone.ts';
import type { CardProps } from '../types.ts';

const props = withDefaults(defineProps<CardProps>(), {
  as: CardElement.Div,
  tone: CardTone.Default,
  padding: CardPadding.Md,
  labelledBy: undefined,
});

const labelled = computed(() =>
  (props.as === CardElement.Section || props.as === CardElement.Article) && props.labelledBy
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
