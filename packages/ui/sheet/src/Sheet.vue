<script setup lang="ts">
import { onBeforeUnmount, onMounted, useId, useTemplateRef, watch } from 'vue';
import { lockScroll, unlockScroll } from './scrollLock.ts';

const props = withDefaults(
  defineProps<{
    /** Visible heading; also the dialog's accessible name. */
    title: string;
    /** Accessible name of the close button (the icon has no text). */
    closeLabel: string;
    /** Close when the dimmed area above the sheet is pressed. */
    dismissOnScrim?: boolean;
  }>(),
  { dismissOnScrim: true },
);

const open = defineModel<boolean>('open', { default: false });

const titleId = useId();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const closeButton = useTemplateRef<HTMLButtonElement>('closeButton');
const scroller = useTemplateRef<HTMLElement>('scroller');
const footer = useTemplateRef<HTMLElement>('footer');

// A native modal <dialog> gives the focus trap, inert background, Escape and focus return for free,
// and stays in the DOM tree where it is declared (so the page's theme container still applies).
let locked = false;

function release() {
  if (locked) {
    locked = false;
    unlockScroll();
  }
}

function sync() {
  const el = dialog.value;
  if (!el) return;
  if (open.value && !el.open) {
    el.showModal();
    if (!locked) {
      locked = true;
      lockScroll();
    }
  } else if (!open.value && el.open) {
    el.close();
    release();
  }
}

onMounted(sync);
watch(open, sync, { flush: 'post' });
onBeforeUnmount(release);

function onCancel() {
  // Escape: let the model decide, so a parent that ignores the update keeps the sheet open.
  open.value = false;
}

function onClose() {
  // Closed without going through the model (e.g. an uncancellable Escape).
  release();
  open.value = false;
}

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"])';

function tabbables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (el) => el.getClientRects().length > 0,
  );
}

/**
 * A native modal dialog keeps Tab out of the page behind it but hands focus to the browser's own UI
 * after the last control (and browsers differ). Wrap explicitly so focus never leaves the sheet.
 * Order: close button, content (a scrollable area with nothing focusable in it is itself a Tab
 * stop in Chromium), footer.
 */
function onTab(event: KeyboardEvent) {
  const scrolls = !!scroller.value && scroller.value.scrollHeight > scroller.value.clientHeight;
  const content = tabbables(scroller.value);
  const stops = [
    ...(closeButton.value ? [closeButton.value] : []),
    ...(content.length === 0 && scrolls && scroller.value ? [scroller.value] : content),
    ...tabbables(footer.value),
  ];
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === dialog.value)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function onScrim() {
  if (props.dismissOnScrim) open.value = false;
}
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="titleId"
    class="group m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 text-text transition-[display,overlay] transition-discrete"
    @cancel.prevent="onCancel"
    @close="onClose"
    @keydown.tab="onTab"
  >
    <div
      aria-hidden="true"
      class="absolute inset-0 bg-scrim opacity-0 transition-opacity group-open:opacity-100 starting:group-open:opacity-0"
      @click="onScrim"
    />
    <div
      class="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] w-full max-w-md translate-y-full flex-col rounded-t-lg border border-b-0 border-border bg-surface text-text transition-transform group-open:translate-y-0 starting:group-open:translate-y-full"
    >
      <div class="flex shrink-0 items-start gap-2 py-2 pr-2 pl-4">
        <h2 :id="titleId" class="min-w-0 flex-1 py-2 text-lg font-semibold break-words">
          {{ title }}
        </h2>
        <button
          ref="closeButton"
          type="button"
          :aria-label="closeLabel"
          class="inline-flex size-tap shrink-0 items-center justify-center rounded-md text-text hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          @click="open = false"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            class="size-6"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
      <div ref="scroller" class="min-h-0 flex-1 overflow-y-auto px-4 py-2 overscroll-contain">
        <slot />
      </div>
      <div
        v-if="$slots.footer"
        ref="footer"
        class="flex shrink-0 flex-wrap items-center gap-2 border-t border-border p-4"
      >
        <slot name="footer" />
      </div>
    </div>
  </dialog>
</template>
