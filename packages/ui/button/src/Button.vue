<script setup lang="ts">
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

withDefaults(
  defineProps<{
    variant?: ButtonVariant;
    /** Defaults to "button" so a Button inside a form never submits it by accident. */
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    /** Fill the width of the parent (primary actions at the bottom of a screen). */
    block?: boolean;
  }>(),
  { variant: 'primary', type: 'button', disabled: false, block: false },
);

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent/90',
  secondary: 'border border-border-strong bg-surface text-text hover:bg-surface-sunken',
  ghost: 'bg-transparent text-accent hover:bg-accent-soft',
  danger: 'bg-danger text-on-danger hover:bg-danger/90',
};
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex min-h-tap min-w-tap items-center justify-center gap-2 rounded-md px-4 py-2 text-base font-semibold transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50"
    :class="[variants[variant], block && 'w-full']"
  >
    <slot />
  </button>
</template>
