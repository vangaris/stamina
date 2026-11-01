import { TABBABLE_SELECTOR } from '../config.ts';
import type { SheetTabRegions } from '../types.ts';

function tabbables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)].filter(
    (el) => el.getClientRects().length > 0,
  );
}

/**
 * A native modal dialog keeps Tab out of the page behind it but hands focus to the browser's own UI
 * after the last control (and browsers differ). Wrap explicitly so focus never leaves the sheet.
 * Order: close button, content (a scrollable area with nothing focusable in it is itself a Tab
 * stop in Chromium), footer. Moves focus and prevents default only when Tab would leave the ends.
 */
export function wrapTabFocus(event: KeyboardEvent, regions: SheetTabRegions): void {
  const { dialog, closeButton, scroller, footer } = regions;
  const scrolls = !!scroller && scroller.scrollHeight > scroller.clientHeight;
  const content = tabbables(scroller);
  const stops = [
    ...(closeButton ? [closeButton] : []),
    ...(content.length === 0 && scrolls && scroller ? [scroller] : content),
    ...tabbables(footer),
  ];
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === dialog)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
