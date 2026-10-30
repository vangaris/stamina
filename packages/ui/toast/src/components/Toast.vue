<script setup lang="ts">
import { TOAST_TONE_CLASSES, TOAST_TONE_ICON_PATHS } from '../config.ts';
import { useAutoDismiss } from '../composables/useAutoDismiss.ts';
import type { ToastProps } from '../types.ts';

const props = withDefaults(defineProps<ToastProps>(), {
  tone: 'info',
  actionLabel: undefined,
  durationMs: undefined,
});

const emit = defineEmits<{ dismiss: []; action: [] }>();

const { onPointer, onFocusIn, onFocusOut } = useAutoDismiss({
  durationMs: () => props.durationMs,
  tone: () => props.tone,
  onDismiss: () => emit('dismiss'),
});
</script>

<template>
  <div
    class="pointer-events-auto mt-2 flex w-full items-center gap-2 rounded-lg border-2 py-1 pr-1 pl-3 text-sm"
    :class="TOAST_TONE_CLASSES[tone]"
    @pointerenter="onPointer($event, true)"
    @pointerleave="onPointer($event, false)"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
    @keydown.esc="emit('dismiss')"
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      class="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path :d="TOAST_TONE_ICON_PATHS[tone]" />
    </svg>
    <p class="min-w-0 flex-1 py-2 font-medium break-words">{{ message }}</p>
    <button
      v-if="actionLabel"
      type="button"
      class="inline-flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-md px-3 text-sm font-semibold underline transition-colors hover:bg-text/10 focus-ring"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
    <button
      type="button"
      :aria-label="dismissLabel"
      class="inline-flex size-tap shrink-0 items-center justify-center rounded-md transition-colors hover:bg-text/10 focus-ring"
      @click="emit('dismiss')"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        class="size-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
      </svg>
    </button>
  </div>
</template>
