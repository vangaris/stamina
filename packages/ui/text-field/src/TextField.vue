<script setup lang="ts">
import { computed, ref, useAttrs, useId } from 'vue';

export type TextFieldType = 'text' | 'email' | 'tel' | 'password' | 'search' | 'url';
export type TextFieldInputmode =
  'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';

// Class and style stay on the wrapper; everything else (inputmode, maxlength, listeners, ...)
// lands on the <input>.
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    /** Visible label; it is the accessible name. Never replaced by the placeholder. */
    label: string;
    type?: TextFieldType;
    /** Which on-screen keyboard to show: `numeric` for a birth year, `decimal` for a weight. */
    inputmode?: TextFieldInputmode | undefined;
    autocomplete?: string | undefined;
    placeholder?: string | undefined;
    /** Helper text under the field. Part of the accessible description. */
    hint?: string | undefined;
    /** Error message. Sets `aria-invalid`, is announced, and is shown with an icon. */
    error?: string | undefined;
    required?: boolean;
    disabled?: boolean;
    maxlength?: number | undefined;
    name?: string | undefined;
  }>(),
  {
    type: 'text',
    inputmode: undefined,
    autocomplete: undefined,
    placeholder: undefined,
    hint: undefined,
    error: undefined,
    required: false,
    disabled: false,
    maxlength: undefined,
    name: undefined,
  },
);

const model = defineModel<string>({ default: '' });

const slots = defineSlots<{
  /** A unit shown beside the field, e.g. "kg". Read out as part of the description. */
  suffix?: () => unknown;
}>();

const attrs = useAttrs();
const generatedId = useId();
const inputId = computed(() => (typeof attrs.id === 'string' ? attrs.id : `${generatedId}-input`));
const hintId = `${generatedId}-hint`;
const errorId = `${generatedId}-error`;
const suffixId = `${generatedId}-suffix`;

const wrapperAttrs = computed(() => ({ class: attrs.class, style: attrs.style }));
// `id` and `aria-describedby` are merged into the input's own below.
const WRAPPER_OR_MERGED = new Set(['class', 'style', 'id', 'aria-describedby']);
const inputAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !WRAPPER_OR_MERGED.has(key))),
);

const describedBy = computed(() => {
  const ids = [
    typeof attrs['aria-describedby'] === 'string' ? attrs['aria-describedby'] : undefined,
    slots.suffix ? suffixId : undefined,
    props.hint ? hintId : undefined,
    props.error ? errorId : undefined,
  ].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
});

const input = ref<HTMLInputElement | null>(null);
defineExpose({
  focus: (options?: FocusOptions) => input.value?.focus(options),
});
</script>

<template>
  <div class="flex flex-col gap-1" v-bind="wrapperAttrs">
    <label :for="inputId" class="text-sm font-medium text-text">
      {{ label }}
      <span v-if="required" aria-hidden="true"> *</span>
    </label>
    <div class="flex items-center gap-2">
      <input
        :id="inputId"
        ref="input"
        v-model="model"
        v-bind="inputAttrs"
        :type="type"
        :inputmode="inputmode"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :maxlength="maxlength"
        :name="name"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        class="min-h-tap w-full min-w-0 flex-1 rounded-md border-2 bg-surface px-3 py-2 text-base text-text placeholder:text-text-muted focus-ring disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-50"
        :class="error ? 'border-danger' : 'border-border-strong'"
      />
      <span v-if="slots.suffix" :id="suffixId" class="shrink-0 text-base text-text-muted">
        <slot name="suffix" />
      </span>
    </div>
    <p v-if="hint" :id="hintId" class="text-sm text-text-muted">{{ hint }}</p>
    <!-- The live region is always rendered so that a message appearing in it is announced. -->
    <div :id="errorId" aria-live="polite" class="empty:hidden">
      <p
        v-if="error"
        class="flex items-start gap-2 rounded-md bg-danger-soft px-2 py-1 text-sm font-medium text-on-danger-soft"
      >
        <!-- The error is not shown by colour alone: icon plus message. -->
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          class="size-4 shrink-0"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="8" cy="8" r="6.5" />
          <path d="M8 4.5v4M8 11v.5" />
        </svg>
        <span>{{ error }}</span>
      </p>
    </div>
  </div>
</template>
