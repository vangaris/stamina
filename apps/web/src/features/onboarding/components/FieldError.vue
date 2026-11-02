<script setup lang="ts">
import type { FieldErrorProps } from '../types.ts';

defineProps<FieldErrorProps>();
</script>

<template>
  <!-- The live region is always rendered so that a message appearing in it is announced. -->
  <div aria-live="polite" class="empty:hidden">
    <p
      v-if="message"
      class="flex items-start gap-2 rounded-md bg-danger-soft px-2 py-1 text-sm font-medium text-on-danger-soft"
    >
      <!-- Not shown by colour alone: icon plus message. -->
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
      <span>{{ message }}</span>
    </p>
  </div>
</template>
