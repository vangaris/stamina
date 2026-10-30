import type { PartitionedToasts, ToastItem } from '../types.ts';

/** Danger toasts are announced as alerts; everything else (incl. no tone) as status. Order is kept. */
export function partitionToasts(toasts: readonly ToastItem[]): PartitionedToasts {
  return {
    status: toasts.filter((t) => t.tone !== 'danger'),
    alert: toasts.filter((t) => t.tone === 'danger'),
  };
}
