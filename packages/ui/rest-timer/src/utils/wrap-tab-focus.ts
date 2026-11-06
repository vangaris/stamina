/**
 * A native modal dialog keeps Tab out of the page behind it but hands focus to the browser's own UI
 * after the last control (browsers differ). Wrap explicitly so focus never leaves the dialog.
 * Moves focus and prevents default only when Tab would leave either end.
 */
export function wrapTabFocus(event: KeyboardEvent, stops: readonly HTMLElement[]): void {
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
