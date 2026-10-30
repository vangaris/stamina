import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref, type EffectScope } from 'vue';
import { DEFAULT_DURATION_MS } from '../config.ts';
import type { ToastTone } from '../types.ts';
import { useAutoDismiss } from './useAutoDismiss.ts';

function setup(initial: { durationMs?: number | null; tone?: ToastTone } = {}) {
  const durationMs = ref<number | null | undefined>(initial.durationMs);
  const tone = ref<ToastTone>(initial.tone ?? 'info');
  const onDismiss = vi.fn();
  const scope = effectScope();
  const api = scope.run(() =>
    useAutoDismiss({ durationMs: () => durationMs.value, tone: () => tone.value, onDismiss }),
  )!;
  return { api, durationMs, tone, onDismiss, scope };
}

const pointer = (pointerType: string) => ({ pointerType }) as PointerEvent;
function focusOut(inside: boolean) {
  const host = document.createElement('div');
  const child = document.createElement('button');
  host.append(child);
  return {
    currentTarget: host,
    relatedTarget: inside ? child : null,
  } as unknown as FocusEvent;
}

describe('useAutoDismiss', () => {
  let scope: EffectScope | undefined;
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    scope?.stop();
    scope = undefined;
    vi.useRealTimers();
  });
  function start(initial?: Parameters<typeof setup>[0]) {
    const s = setup(initial);
    scope = s.scope;
    return s;
  }

  it('dismisses after the default duration', () => {
    const { onDismiss } = start();
    vi.advanceTimersByTime(DEFAULT_DURATION_MS - 1);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses the given duration', () => {
    const { onDismiss } = start({ durationMs: 1000 });
    vi.advanceTimersByTime(1000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('never dismisses when persistent (null) or danger without a duration', () => {
    const a = start({ durationMs: null });
    const b = start({ tone: 'danger' });
    vi.advanceTimersByTime(DEFAULT_DURATION_MS * 10);
    expect(a.onDismiss).not.toHaveBeenCalled();
    expect(b.onDismiss).not.toHaveBeenCalled();
  });

  it('honours an explicit duration on a danger toast', () => {
    const { onDismiss } = start({ tone: 'danger', durationMs: 2000 });
    vi.advanceTimersByTime(2000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('pauses while hovered and restarts the full duration on leave', () => {
    const { api, onDismiss } = start({ durationMs: 1000 });
    vi.advanceTimersByTime(900);
    api.onPointer(pointer('mouse'), true);
    vi.advanceTimersByTime(10_000);
    expect(onDismiss).not.toHaveBeenCalled();
    api.onPointer(pointer('mouse'), false);
    vi.advanceTimersByTime(999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not count a touch pointer as hovering', () => {
    const { api, onDismiss } = start({ durationMs: 1000 });
    api.onPointer(pointer('touch'), true);
    vi.advanceTimersByTime(1000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('pauses while focus is inside and restarts when focus leaves the toast', () => {
    const { api, onDismiss } = start({ durationMs: 1000 });
    api.onFocusIn();
    vi.advanceTimersByTime(5000);
    expect(onDismiss).not.toHaveBeenCalled();
    api.onFocusOut(focusOut(true));
    vi.advanceTimersByTime(5000);
    expect(onDismiss).not.toHaveBeenCalled();
    api.onFocusOut(focusOut(false));
    vi.advanceTimersByTime(1000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('stays paused until both hover and focus are gone', () => {
    const { api, onDismiss } = start({ durationMs: 1000 });
    api.onPointer(pointer('mouse'), true);
    api.onFocusIn();
    api.onPointer(pointer('mouse'), false);
    vi.advanceTimersByTime(5000);
    expect(onDismiss).not.toHaveBeenCalled();
    api.onFocusOut(focusOut(false));
    vi.advanceTimersByTime(1000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('restarts the countdown when the duration changes', () => {
    const { durationMs, onDismiss } = start({ durationMs: 1000 });
    vi.advanceTimersByTime(900);
    durationMs.value = 3000;
    vi.advanceTimersByTime(2999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('stops the timer when its scope stops', () => {
    const { scope: s, onDismiss } = start({ durationMs: 1000 });
    s.stop();
    vi.advanceTimersByTime(5000);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
