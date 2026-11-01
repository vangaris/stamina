/**
 * Locks page scrolling while at least one sheet is open. Counted, so two sheets open at once (or one
 * opening as another closes) restore the original value only when the last one is gone.
 */
let locks = 0;
let saved = '';

export function lockScroll(): void {
  if (locks++ === 0) {
    const root = document.documentElement;
    saved = root.style.overflow;
    root.style.overflow = 'hidden';
  }
}

export function unlockScroll(): void {
  if (locks > 0 && --locks === 0) {
    document.documentElement.style.overflow = saved;
  }
}
