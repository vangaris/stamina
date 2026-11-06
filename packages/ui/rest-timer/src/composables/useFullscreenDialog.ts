import { onBeforeUnmount, onMounted, type Ref } from 'vue';

/**
 * Opens a native modal <dialog> when the component mounts and closes it when it unmounts. A
 * native modal gives the inert background and Escape, and stays in the DOM tree where it is
 * declared (so the page's theme container still applies). Focus goes to `initialFocus`, and
 * returns to whatever had it before when the component goes away.
 */
export function useFullscreenDialog(
  dialog: Readonly<Ref<HTMLDialogElement | null>>,
  initialFocus: Readonly<Ref<HTMLElement | null>>,
) {
  let opener: HTMLElement | null = null;

  onMounted(() => {
    const el = dialog.value;
    if (!el) return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!el.open) el.showModal();
    initialFocus.value?.focus();
  });

  onBeforeUnmount(() => {
    const el = dialog.value;
    if (el?.open) el.close();
    if (opener?.isConnected) opener.focus();
    opener = null;
  });
}
