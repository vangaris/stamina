import { Key } from '@stamina/a11y';
/**
 * jsdom has no <dialog>.showModal(). This stands in for the browser behaviour the component relies
 * on: a modal dialog gets `open`, an unprevented Escape keydown fires a cancelable `cancel` event
 * (closing unless that is prevented), and closing fires `close`. Focus handling, the trap and
 * layout are proven in Chromium by apps/web/e2e/ui-kit-rest-timer.spec.ts.
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
    if (e.key !== Key.Escape || e.defaultPrevented) return;
    const dialog = [...document.querySelectorAll('dialog[open]')].pop() as
      HTMLDialogElement | undefined;
    if (dialog && dialog.dispatchEvent(new Event('cancel', { cancelable: true }))) dialog.close();
  });
}
