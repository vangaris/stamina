import { afterEach, describe, expect, it } from 'vitest';
import { lockScroll, unlockScroll } from './scroll-lock.ts';

const root = document.documentElement;

afterEach(() => {
  // drain any leaked locks, then reset
  for (let i = 0; i < 5; i++) unlockScroll();
  root.style.overflow = '';
});

describe('scroll lock', () => {
  it('hides overflow and restores the previous value', () => {
    root.style.overflow = 'scroll';
    lockScroll();
    expect(root.style.overflow).toBe('hidden');
    unlockScroll();
    expect(root.style.overflow).toBe('scroll');
  });

  it('restores only when the last lock is released', () => {
    lockScroll();
    lockScroll();
    unlockScroll();
    expect(root.style.overflow).toBe('hidden');
    unlockScroll();
    expect(root.style.overflow).toBe('');
  });

  it('does not save "hidden" as the original when a second lock arrives', () => {
    root.style.overflow = 'auto';
    lockScroll();
    lockScroll();
    unlockScroll();
    unlockScroll();
    expect(root.style.overflow).toBe('auto');
  });

  it('ignores an unlock with no lock held and does not break later locks', () => {
    root.style.overflow = 'auto';
    unlockScroll();
    expect(root.style.overflow).toBe('auto');
    lockScroll();
    unlockScroll();
    expect(root.style.overflow).toBe('auto');
  });
});
