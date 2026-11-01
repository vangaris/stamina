<script setup lang="ts">
import { joinIds } from '@stamina/a11y';
import { computed, useId } from 'vue';
import { SELECT_CHEVRON_PATH } from '../config.ts';
import type { SelectProps } from '../types.ts';

const props = withDefaults(defineProps<SelectProps>(), {
  hint: undefined,
  error: undefined,
  required: false,
  disabled: false,
  autocomplete: undefined,
  name: undefined,
});

/** The chosen option's value; empty until the person chooses. */
const model = defineModel<string>({ default: '' });

const id = useId();
const selectId = `${id}-select`;
const hintId = `${id}-hint`;
const errorId = `${id}-error`;

const describedBy = computed(() => joinIds(props.hint && hintId, props.error && errorId));
</script>

<template>
  <div class="flex flex-col gap-1">
    <label :for="selectId" class="text-sm font-medium text-text">
      {{ label }}
      <span v-if="required" aria-hidden="true"> *</span>
    </label>
    <div class="relative">
      <select
        :id="selectId"
        v-model="model"
        :name="name"
        :autocomplete="autocomplete"
        :required="required"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy"
        class="min-h-tap w-full appearance-none rounded-md border-2 bg-surface py-2 pr-10 pl-3 text-base text-text focus-ring disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-50"
        :class="error ? 'border-danger' : 'border-border-strong'"
      >
        <option value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>
      <!-- The native arrow is removed so the control looks the same in both themes. -->
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-muted"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path :d="SELECT_CHEVRON_PATH" />
      </svg>
    </div>
    <p v-if="hint" :id="hintId" class="text-sm text-text-muted">{{ hint }}</p>
    <!-- The live region is always rendered so that a message appearing in it is announced. -->
    <div :id="errorId" aria-live="polite" class="empty:hidden">
      <p
        v-if="error"
        class="flex items-start gap-2 rounded-md bg-danger-soft px-2 py-1 text-sm font-medium text-on-danger-soft"
      >
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
