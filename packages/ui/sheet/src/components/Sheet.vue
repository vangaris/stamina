<script setup lang="ts">
import { useId, useTemplateRef } from 'vue';
import { useModalDialog } from '../composables/useModalDialog.ts';
import type { SheetProps } from '../types.ts';
import { wrapTabFocus } from '../utils/wrap-tab-focus.ts';

const props = withDefaults(defineProps<SheetProps>(), { dismissOnScrim: true });

const open = defineModel<boolean>('open', { default: false });

const titleId = useId();
const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const closeButton = useTemplateRef<HTMLButtonElement>('closeButton');
const scroller = useTemplateRef<HTMLElement>('scroller');
const footer = useTemplateRef<HTMLElement>('footer');

const { onCancel, onClose } = useModalDialog(dialog, open);

function onTab(event: KeyboardEvent) {
  wrapTabFocus(event, {
    dialog: dialog.value,
    closeButton: closeButton.value,
    scroller: scroller.value,
    footer: footer.value,
  });
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
          class="inline-flex size-tap shrink-0 items-center justify-center rounded-md text-text hover:bg-surface-sunken focus-ring"
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
