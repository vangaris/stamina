import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue';
import { lockScroll, unlockScroll } from '../utils/scroll-lock.ts';

/**
 * Keeps a native modal <dialog> and a boolean model in step. A native modal gives the focus trap,
 * inert background, Escape and focus return for free, and stays in the DOM tree where it is
 * declared (so the page's theme container still applies). Page scrolling is locked while open.
 * Returns the handlers for the dialog's `cancel` and `close` events.
 */
export function useModalDialog(
  dialog: Readonly<Ref<HTMLDialogElement | null>>,
  open: Ref<boolean>,
) {
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

  return {
    onCancel() {
      // Escape: let the model decide, so a parent that ignores the update keeps the sheet open.
      open.value = false;
    },
    onClose() {
      // Closed without going through the model (e.g. an uncancellable Escape).
      release();
      open.value = false;
    },
  };
}
