import { Key } from '@stamina/a11y';
/**
 * jsdom has no <dialog>.showModal(). This stands in for the browser behaviour the component relies
 * on: a modal dialog gets `open`, a `cancel` event on Escape (closing unless prevented) and a
 * `close` event. Focus handling, the trap and layout are proven in Chromium by
 * apps/web/e2e/ui-kit-sheet.spec.ts.
 */
export function installDialogPolyfill(): void {
  const proto = HTMLDialogElement.prototype as HTMLDialogElement & { showModal?: () => void };
  proto.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  proto.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
  document.addEventListener('keydown', (e) => {
    if (e.key !== Key.Escape) return;
    const dialog = [...document.querySelectorAll('dialog[open]')].pop() as
      HTMLDialogElement | undefined;
    if (dialog && dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
  });
}
