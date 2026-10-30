<script setup lang="ts">
import { computed } from 'vue';
import Toast, { type ToastTone } from './Toast.vue';

export interface ToastItem {
  id: string;
  message: string;
  tone?: ToastTone;
  actionLabel?: string;
  /** Milliseconds before it dismisses itself, `null` to stay. Default: 5000; danger: stays. */
  durationMs?: number | null;
}

const props = withDefaults(
  defineProps<{
    /** The queue. The caller owns it and removes a toast when `dismiss` fires. */
    toasts: readonly ToastItem[];
    /** Accessible name of every toast's close button. */
    dismissLabel: string;
    /**
     * `fixed` sits at the bottom of the screen above the bottom navigation. `absolute` fills
     * the bottom of the nearest positioned ancestor (a preview box, a dialog).
     */
    position?: 'fixed' | 'absolute';
  }>(),
  { position: 'fixed' },
);

const emit = defineEmits<{ dismiss: [id: string]; action: [id: string] }>();

// Two persistent live regions: polite for routine feedback, assertive for errors. They stay in
// the DOM when empty because screen readers only announce changes inside a region they already
// know about.
const polite = computed(() => props.toasts.filter((t) => t.tone !== 'danger'));
const assertive = computed(() => props.toasts.filter((t) => t.tone === 'danger'));

const placement = computed(() =>
  props.position === 'fixed'
    ? // Clears the bottom navigation (one tap target tall) and the phone's home indicator.
      'fixed pb-[calc(env(safe-area-inset-bottom)+var(--st-space-tap)+var(--st-space-4))]'
    : 'absolute pb-2',
);
</script>

<template>
  <div
    class="pointer-events-none inset-x-0 bottom-0 z-50 flex flex-col items-center px-4"
    :class="placement"
  >
    <TransitionGroup
      tag="div"
      role="status"
      aria-live="polite"
      class="flex w-full max-w-md flex-col"
      enter-active-class="transition"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition"
      leave-to-class="opacity-0"
    >
      <Toast
        v-for="toast in polite"
        :key="toast.id"
        :message="toast.message"
        :tone="toast.tone ?? 'info'"
        :action-label="toast.actionLabel"
        :duration-ms="toast.durationMs"
        :dismiss-label="dismissLabel"
        @dismiss="emit('dismiss', toast.id)"
        @action="emit('action', toast.id)"
      />
    </TransitionGroup>
    <TransitionGroup
      tag="div"
      role="alert"
      class="flex w-full max-w-md flex-col"
      enter-active-class="transition"
      enter-from-class="translate-y-2 opacity-0"
      leave-active-class="transition"
      leave-to-class="opacity-0"
    >
      <Toast
        v-for="toast in assertive"
        :key="toast.id"
        :message="toast.message"
        tone="danger"
        :action-label="toast.actionLabel"
        :duration-ms="toast.durationMs"
        :dismiss-label="dismissLabel"
        @dismiss="emit('dismiss', toast.id)"
        @action="emit('action', toast.id)"
      />
    </TransitionGroup>
  </div>
</template>
