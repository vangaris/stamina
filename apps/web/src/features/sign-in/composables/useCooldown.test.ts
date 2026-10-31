import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope } from 'vue';
import { useCooldown } from './useCooldown.ts';

describe('useCooldown', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('counts down once per tick and stops at zero', () => {
    const scope = effectScope();
    const cooldown = scope.run(() => useCooldown({ seconds: 3, tickMs: 1000 }))!;

    expect(cooldown.remaining.value).toBe(0);
    cooldown.start();
    expect(cooldown.remaining.value).toBe(3);
    vi.advanceTimersByTime(1000);
    expect(cooldown.remaining.value).toBe(2);
    vi.advanceTimersByTime(5000);
    expect(cooldown.remaining.value).toBe(0);
    scope.stop();
  });

  it('restarts from the full duration', () => {
    const scope = effectScope();
    const cooldown = scope.run(() => useCooldown({ seconds: 3, tickMs: 1000 }))!;

    cooldown.start();
    vi.advanceTimersByTime(2000);
    cooldown.start();
    expect(cooldown.remaining.value).toBe(3);
    scope.stop();
  });

  it('stops ticking when its scope is disposed', () => {
    const scope = effectScope();
    const cooldown = scope.run(() => useCooldown({ seconds: 3, tickMs: 1000 }))!;

    cooldown.start();
    scope.stop();
    vi.advanceTimersByTime(3000);
    expect(cooldown.remaining.value).toBe(3);
  });
});
