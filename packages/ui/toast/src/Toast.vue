<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';

export type ToastTone = 'info' | 'success' | 'danger';

const DEFAULT_DURATION_MS = 5000;

const props = withDefaults(
  defineProps<{
    message: string;
    tone?: ToastTone;
    /** Optional action shown next to the message ("Undo"). */
    actionLabel?: string | undefined;
    /** Accessible name of the close button. */
    dismissLabel: string;
    /**
     * How long it stays before it emits `dismiss`: milliseconds, or `null` to stay until the
     * user closes it. Omitted: 5000 ms, except danger toasts, which stay.
     */
    durationMs?: number | null | undefined;
  }>(),
  { tone: 'info', actionLabel: undefined, durationMs: undefined },
);

const emit = defineEmits<{ dismiss: []; action: [] }>();

const tones: Record<ToastTone, string> = {
  info: 'border-border-strong bg-surface text-text',
  success: 'border-accent bg-accent-soft text-on-accent-soft',
  danger: 'border-danger bg-danger-soft text-on-danger-soft',
};

// Distinct glyph per tone, so the tone never relies on colour alone.
const icons: Record<ToastTone, string> = {
  info: 'M8 7.5v4M8 4.75v.01M8 14.25a6.25 6.25 0 100-12.5 6.25 6.25 0 000 12.5z',
  success: 'M4.5 8.5l2.5 2.5 4.5-5M8 14.25a6.25 6.25 0 100-12.5 6.25 6.25 0 000 12.5z',
  danger: 'M8 6v3.5M8 11.75v.01M8 2L1.75 13.25h12.5z',
};

const duration = computed(() =>
  props.durationMs === undefined
    ? props.tone === 'danger'
      ? null
      : DEFAULT_DURATION_MS
    : props.durationMs,
);

// The countdown only runs while nobody is hovering over or working inside the toast (WCAG 2.2.1).
// Leaving starts the full duration again, so there is always time to read and react. The effect
// is synchronous so a countdown never outlives the pause that should have stopped it.
const hovered = ref(false);
const focused = ref(false);

watchEffect(
  (onCleanup) => {
    const ms = duration.value;
    if (ms === null || hovered.value || focused.value) return;
    const timer = setTimeout(() => emit('dismiss'), ms);
    onCleanup(() => clearTimeout(timer));
  },
  { flush: 'sync' },
);

// Touch has no hover: a tap would otherwise leave the toast "hovered" until the next tap.
function onPointer(event: PointerEvent, inside: boolean) {
  if (event.pointerType !== 'touch') hovered.value = inside;
}

function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget;
  if (!(next instanceof Node) || !(event.currentTarget as Element).contains(next)) {
    focused.value = false;
  }
}
</script>

<template>
  <div
    class="pointer-events-auto mt-2 flex w-full items-center gap-2 rounded-lg border-2 py-1 pr-1 pl-3 text-sm"
    :class="tones[tone]"
    @pointerenter="onPointer($event, true)"
    @pointerleave="onPointer($event, false)"
    @focusin="focused = true"
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
      <path :d="icons[tone]" />
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
