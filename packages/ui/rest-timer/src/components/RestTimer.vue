<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue';
import { RING_RADIUS, RING_STROKE_WIDTH, RING_VIEWBOX, TABBABLE_SELECTOR } from '../config.ts';
import { useAnnouncement } from '../composables/useAnnouncement.ts';
import { useFullscreenDialog } from '../composables/useFullscreenDialog.ts';
import type { RestTimerEmits, RestTimerProps } from '../types.ts';
import { computeRing } from '../utils/compute-ring.ts';
import { formatRemainingTime } from '../utils/format-remaining-time.ts';
import { wrapTabFocus } from '../utils/wrap-tab-focus.ts';

/**
 * A full-screen rest countdown. Presentational: the caller owns the clock and passes
 * `remainingSeconds` in; the component is open while it is mounted (render it with `v-if`).
 * `skip` fires from the Skip button and from Escape; `add` from the optional add-time button.
 */
const props = withDefaults(defineProps<RestTimerProps>(), {
  nextLabel: undefined,
  addLabel: undefined,
});
const emit = defineEmits<RestTimerEmits>();

const titleId = useId();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const skipButton = useTemplateRef<HTMLButtonElement>('skipButton');

useFullscreenDialog(dialog, skipButton);

const time = computed(() => formatRemainingTime(props.remainingSeconds));
const ring = computed(() => computeRing(props.remainingSeconds, props.totalSeconds));
const announcement = useAnnouncement(
  () => props.remainingSeconds,
  () => props.announce,
);

function onTab(event: KeyboardEvent) {
  const stops = dialog.value?.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR) ?? [];
  wrapTabFocus(event, [...stops]);
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-bg p-0 text-text overscroll-none"
    @keydown.esc.prevent="emit('skip')"
    @cancel.prevent="emit('skip')"
    @keydown.tab="onTab"
  >
    <div
      class="mx-auto flex h-full w-full max-w-md flex-col items-center justify-between gap-6 p-6"
    >
      <h2 :id="titleId" class="text-xl font-semibold">{{ label }}</h2>

      <div class="flex w-full flex-col items-center gap-6">
        <div class="relative aspect-square w-full max-w-xs">
          <svg
            aria-hidden="true"
            focusable="false"
            :viewBox="`0 0 ${RING_VIEWBOX} ${RING_VIEWBOX}`"
            fill="none"
            class="size-full -rotate-90"
          >
            <circle
              :cx="RING_VIEWBOX / 2"
              :cy="RING_VIEWBOX / 2"
              :r="RING_RADIUS"
              :stroke-width="RING_STROKE_WIDTH"
              class="stroke-surface-sunken"
            />
            <circle
              :cx="RING_VIEWBOX / 2"
              :cy="RING_VIEWBOX / 2"
              :r="RING_RADIUS"
              :stroke-width="RING_STROKE_WIDTH"
              stroke-linecap="round"
              :stroke-dasharray="ring.circumference"
              :stroke-dashoffset="ring.dashOffset"
              class="stroke-accent transition-[stroke-dashoffset] ease-linear"
            />
          </svg>
          <p
            data-testid="rest-timer-time"
            class="absolute inset-0 flex items-center justify-center text-3xl font-semibold tabular-nums"
          >
            {{ time }}
          </p>
        </div>

        <p v-if="$slots.next || nextLabel" class="text-center text-lg text-text-muted">
          <slot name="next">{{ nextLabel }}</slot>
        </p>
      </div>

      <div class="flex w-full flex-col gap-3">
        <button
          v-if="addLabel"
          type="button"
          class="min-h-tap w-full rounded-md border border-border-strong bg-surface px-6 py-3 text-base font-semibold text-text transition-colors hover:bg-surface-sunken focus-ring"
          @click="emit('add')"
        >
          {{ addLabel }}
        </button>
        <button
          ref="skipButton"
          type="button"
          class="min-h-tap w-full rounded-md bg-accent px-6 py-4 text-xl font-semibold text-on-accent transition-colors hover:bg-accent/90 focus-ring"
          @click="emit('skip')"
        >
          {{ skipLabel }}
        </button>
      </div>

      <span class="sr-only" role="status" aria-live="polite">{{ announcement }}</span>
    </div>
  </dialog>
</template>
