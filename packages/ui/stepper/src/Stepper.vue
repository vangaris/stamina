<script setup lang="ts">
import { computed, ref, useId } from 'vue';

export type StepperFormat = (value: number) => string;

const props = withDefaults(
  defineProps<{
    /** Visible label, also the accessible name of the value ("Weight"). */
    label: string;
    /** Accessible name of the minus button ("Decrease weight"). Supplied by the caller. */
    decrementLabel: string;
    /** Accessible name of the plus button ("Increase weight"). Supplied by the caller. */
    incrementLabel: string;
    /** Lowest value; unbounded when omitted. */
    min?: number | undefined;
    /** Highest value; unbounded when omitted. */
    max?: number | undefined;
    step?: number;
    /** Shown next to the value and read with it ("kg", "reps"). */
    unit?: string | undefined;
    /** Display format of the value, e.g. a locale-aware `Intl.NumberFormat` (Greek decimal comma). */
    format?: StepperFormat;
    disabled?: boolean;
  }>(),
  {
    min: undefined,
    max: undefined,
    unit: undefined,
    step: 1,
    disabled: false,
    format: (value: number) => String(value),
  },
);

const model = defineModel<number>({ required: true });

const labelId = useId();
// Announces changes made with the buttons; empty until the first change.
const announcement = ref('');

const text = (value: number) => {
  const formatted = props.format(value);
  return props.unit ? `${formatted} ${props.unit}` : formatted;
};
const valueText = computed(() => text(model.value));
const formatted = computed(() => props.format(model.value));

const atMin = computed(() => props.min !== undefined && model.value <= props.min);
const atMax = computed(() => props.max !== undefined && model.value >= props.max);

/** Number of decimal places in the shortest string form of `n` (also for `1e-7`). */
function decimals(n: number | undefined): number {
  if (n === undefined || !Number.isFinite(n)) return 0;
  const [, fraction = '', exponent = '0'] = /^-?\d*\.?(\d*)(?:e([+-]?\d+))?$/.exec(String(n)) ?? [];
  return Math.max(0, fraction.length - Number(exponent));
}

function clamp(n: number): number {
  const low = props.min === undefined ? n : Math.max(props.min, n);
  return props.max === undefined ? low : Math.min(props.max, low);
}

/** Moves to `target` (clamped, float noise removed), emitting only when the value changes. */
function setValue(target: number, announce: boolean) {
  if (props.disabled) return;
  // Round to the precision the inputs have; never the float noise of the sum itself.
  const places = Math.max(
    decimals(props.step),
    decimals(model.value),
    decimals(props.min),
    decimals(props.max),
  );
  const next = clamp(Number(target.toFixed(Math.min(places, 20))));
  if (next === model.value) return;
  model.value = next;
  if (announce) announcement.value = text(next);
}

const stepBy = (direction: 1 | -1, announce: boolean) =>
  setValue(model.value + direction * props.step, announce);

// Arrow keys are handled here on the spinbutton, so the browser's own announcement of the new
// value (aria-valuenow / valuetext) is used and the live region stays quiet to avoid a double read.
function onKeydown(event: KeyboardEvent) {
  if (props.disabled || event.altKey || event.ctrlKey || event.metaKey) return;
  switch (event.key) {
    case 'ArrowUp':
    case 'ArrowRight':
      stepBy(1, false);
      break;
    case 'ArrowDown':
    case 'ArrowLeft':
      stepBy(-1, false);
      break;
    case 'Home':
      if (props.min === undefined) return;
      setValue(props.min, false);
      break;
    case 'End':
      if (props.max === undefined) return;
      setValue(props.max, false);
      break;
    default:
      return;
  }
  event.preventDefault();
}

const buttonClass =
  'flex min-h-tap min-w-tap shrink-0 touch-manipulation items-center justify-center rounded-md bg-accent p-4 text-on-accent transition-colors hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';
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
        :class="buttonClass"
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
        class="flex min-h-tap min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 rounded-md border-2 border-border-strong bg-surface px-3 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
        :class="buttonClass"
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
