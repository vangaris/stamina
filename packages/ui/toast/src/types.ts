export type ToastTone = 'info' | 'success' | 'danger';

export interface ToastProps {
  message: string;
  tone?: ToastTone;
  /** Optional action shown next to the message ("Undo"). */
  actionLabel?: string | undefined;
  /** Accessible name of the close button. */
  dismissLabel: string;
  /**
   * How long it stays before it emits `dismiss`: milliseconds, or `null` to stay until the
   * user closes it. Omitted: 5000 ms, except danger toasts, which stay.
   */
  durationMs?: number | null | undefined;
}

export interface ToastItem {
  id: string;
  message: string;
  tone?: ToastTone;
  actionLabel?: string;
  /** Milliseconds before it dismisses itself, `null` to stay. Default: 5000; danger: stays. */
  durationMs?: number | null;
}

export interface ToastRegionProps {
  /** The queue. The caller owns it and removes a toast when `dismiss` fires. */
  toasts: readonly ToastItem[];
  /** Accessible name of every toast's close button. */
  dismissLabel: string;
  /**
   * `fixed` sits at the bottom of the screen above the bottom navigation. `absolute` fills
   * the bottom of the nearest positioned ancestor (a preview box, a dialog).
   */
  position?: 'fixed' | 'absolute';
}

/** Toasts split by how a screen reader should announce them. */
export interface PartitionedToasts {
  /** Routine feedback, announced politely. */
  status: ToastItem[];
  /** Errors, announced assertively. */
  alert: ToastItem[];
}
