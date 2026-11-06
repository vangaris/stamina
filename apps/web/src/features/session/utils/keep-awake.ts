import { DocumentEvent } from '../enums/document-event.ts';
import { VisibilityState } from '../enums/visibility-state.ts';
import { WakeLockType } from '../enums/wake-lock-type.ts';
import type { KeepAwakeHost } from '../types.ts';

/**
 * Asks the browser to keep the screen on (the Screen Wake Lock API) and gets the lock back when
 * the page returns from being hidden, which releases it. Does nothing where the browser has no
 * wake lock, or refuses it. Returns what lets go of it again.
 */
export function keepAwake({ navigator, document }: KeepAwakeHost): () => void {
  const wakeLock = navigator.wakeLock;
  if (!wakeLock) return () => undefined;

  let sentinel: WakeLockSentinel | undefined;
  let acquiring = false;
  let stopped = false;

  async function acquire() {
    acquiring = true;
    try {
      const lock = await wakeLock!.request(WakeLockType.Screen);
      if (stopped) await lock.release();
      else sentinel = lock;
    } catch {
      // Refused (low battery, a hidden page): the screen may sleep, and nothing else changes.
    } finally {
      acquiring = false;
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState !== VisibilityState.Visible || acquiring) return;
    if (sentinel && !sentinel.released) return;
    void acquire();
  }

  document.addEventListener(DocumentEvent.VisibilityChange, onVisibilityChange);
  void acquire();

  return () => {
    stopped = true;
    document.removeEventListener(DocumentEvent.VisibilityChange, onVisibilityChange);
    sentinel?.release().catch(() => undefined);
  };
}
