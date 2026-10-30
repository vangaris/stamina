<script setup lang="ts">
import { BUTTON_VARIANT_CLASSES } from '../config.ts';
import type { ButtonProps } from '../types.ts';

withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  type: 'button',
  disabled: false,
  block: false,
});
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex min-h-tap min-w-tap items-center justify-center gap-2 rounded-md px-4 py-2 text-base font-semibold transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50"
    :class="[BUTTON_VARIANT_CLASSES[variant], block && 'w-full']"
  >
    <slot />
  </button>
</template>
