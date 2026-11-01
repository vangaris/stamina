import { ref, watchEffect } from 'vue';
import { resolveToastDuration } from '../utils/resolve-toast-duration.ts';
import { PointerType } from '../enums/pointer-type.ts';
import type { ToastTone } from '../enums/toast-tone.ts';

export interface AutoDismissOptions {
  durationMs: () => number | null | undefined;
  tone: () => ToastTone;
  onDismiss: () => void;
}

/**
 * The countdown only runs while nobody is hovering over or working inside the toast (WCAG 2.2.1).
 * Leaving starts the full duration again, so there is always time to read and react. The effect
 * is synchronous so a countdown never outlives the pause that should have stopped it.
 * Must be called inside a component or effect scope: it stops with it.
 */
export function useAutoDismiss({ durationMs, tone, onDismiss }: AutoDismissOptions) {
  const hovered = ref(false);
  const focused = ref(false);

  watchEffect(
    (onCleanup) => {
      const ms = resolveToastDuration(durationMs(), tone());
      if (ms === null || hovered.value || focused.value) return;
      const timer = setTimeout(onDismiss, ms);
      onCleanup(() => clearTimeout(timer));
    },
    { flush: 'sync' },
  );

  // Touch has no hover: a tap would otherwise leave the toast "hovered" until the next tap.
  function onPointer(event: PointerEvent, inside: boolean) {
    if (event.pointerType !== PointerType.Touch) hovered.value = inside;
  }

  function onFocusIn() {
    focused.value = true;
  }

  function onFocusOut(event: FocusEvent) {
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !(event.currentTarget as Element).contains(next)) {
      focused.value = false;
    }
  }

  return { onPointer, onFocusIn, onFocusOut };
}
