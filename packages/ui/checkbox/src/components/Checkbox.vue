<script setup lang="ts">
import { joinIds } from '@stamina/a11y';
import { computed, useId } from 'vue';
import { CHECKBOX_TICK_PATH } from '../config.ts';
import type { CheckboxProps } from '../types.ts';

const props = defineProps<CheckboxProps>();

/** Unticked by default: a consent must never be pre-selected. */
const checked = defineModel<boolean>({ default: false });

const id = useId();
const descriptionId = `${id}-description`;
const errorId = `${id}-error`;

const slots = defineSlots<{
  /** The label; rich content (links, several sentences) is fine. */
  default(): unknown;
  description?(): unknown;
}>();
const hasDescription = computed(() => Boolean(props.description) || 'description' in slots);
const hasError = computed(() => Boolean(props.error));
const describedBy = computed(() =>
  joinIds(hasDescription.value && descriptionId, hasError.value && errorId),
);
</script>

<template>
  <div>
    <label
      class="flex min-h-tap items-start gap-3 py-2"
      :class="disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
    >
      <span class="relative size-6 shrink-0">
        <input
          v-model="checked"
          type="checkbox"
          :disabled="disabled"
          :required="required"
          :aria-invalid="hasError ? 'true' : undefined"
          :aria-describedby="describedBy"
          class="peer size-6 appearance-none rounded-md border-2 bg-surface transition-colors checked:border-accent checked:bg-accent focus-ring"
          :class="hasError ? 'border-danger' : 'border-border-strong'"
        />
        <!-- The tick is drawn, so the checked state is not conveyed by colour alone. -->
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          class="pointer-events-none absolute inset-0 hidden size-6 p-1 text-on-accent peer-checked:block"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path :d="CHECKBOX_TICK_PATH" />
        </svg>
      </span>
      <span class="min-w-0 text-base text-text"
        ><slot /><span v-if="required" aria-hidden="true"> *</span></span
      >
    </label>
    <div v-if="hasDescription || hasError" class="ml-8 flex flex-col items-start gap-1 pl-1">
      <p v-if="hasDescription" :id="descriptionId" class="text-sm text-text-muted">
        <slot name="description">{{ description }}</slot>
      </p>
      <p
        v-if="hasError"
        :id="errorId"
        role="alert"
        class="rounded-md bg-danger-soft px-2 py-1 text-sm font-medium text-on-danger-soft"
      >
        {{ error }}
      </p>
    </div>
  </div>
</template>
