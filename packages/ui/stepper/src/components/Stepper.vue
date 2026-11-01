<script setup lang="ts">
import { computed, useId } from 'vue';
import { STEPPER_BUTTON_CLASS } from '../config.ts';
import { useStepper } from '../composables/useStepper.ts';
import type { StepperProps } from '../types.ts';

const props = withDefaults(defineProps<StepperProps>(), {
  min: undefined,
  max: undefined,
  unit: undefined,
  step: 1,
  disabled: false,
  format: (value: number) => String(value),
});

const model = defineModel<number>({ required: true });

const labelId = useId();

const text = (value: number) => {
  const formatted = props.format(value);
  return props.unit ? `${formatted} ${props.unit}` : formatted;
};
const valueText = computed(() => text(model.value));
const formatted = computed(() => props.format(model.value));

const { announcement, atMin, atMax, stepBy, onKeydown } = useStepper({
  model,
  step: () => props.step,
  min: () => props.min,
  max: () => props.max,
  disabled: () => props.disabled,
  text,
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <span :id="labelId" class="text-sm font-medium text-text">{{ label }}</span>
    <div class="flex items-stretch gap-2">
      <!--
        Spinbutton pattern (APG): the value is the one tab stop and takes arrow keys / Home / End.
        The buttons stay out of the tab order but remain in the accessibility tree, so touch screen
        readers and voice control can still activate them. At a bound they are aria-disabled, not
        disabled: a disabled button drops focus, which would strand a user who just tapped it.
      -->
      <button
        type="button"
        tabindex="-1"
        :aria-label="decrementLabel"
        :disabled="disabled"
        :aria-disabled="atMin || undefined"
        :class="STEPPER_BUTTON_CLASS"
        @click="!atMin && stepBy(-1, true)"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          class="size-6"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
        >
          <path d="M5 12h14" />
        </svg>
      </button>
      <div
        role="spinbutton"
        :tabindex="disabled ? -1 : 0"
        :aria-labelledby="labelId"
        :aria-valuenow="model"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuetext="valueText"
        :aria-disabled="disabled || undefined"
        class="flex min-h-tap min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 rounded-md border-2 border-border-strong bg-surface px-3 text-text focus-ring"
        :class="disabled && 'opacity-50'"
        @keydown="onKeydown"
      >
        <span class="text-2xl font-semibold tabular-nums">{{ formatted }}</span>
        <span v-if="unit" class="text-base text-text-muted">{{ unit }}</span>
      </div>
      <button
        type="button"
        tabindex="-1"
        :aria-label="incrementLabel"
        :disabled="disabled"
        :aria-disabled="atMax || undefined"
        :class="STEPPER_BUTTON_CLASS"
        @click="!atMax && stepBy(1, true)"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          class="size-6"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
        >
          <path d="M5 12h14M12 5v14" />
        </svg>
      </button>
    </div>
    <span class="sr-only" role="status" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
