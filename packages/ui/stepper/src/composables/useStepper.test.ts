import { Key } from '@stamina/a11y';
import { ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useStepper } from './useStepper.ts';

function setup(
  initial: number,
  bounds: { min?: number; max?: number; step?: number; disabled?: boolean } = {},
) {
  const model = ref(initial);
  const stepper = useStepper({
    model,
    step: () => bounds.step ?? 1,
    min: () => bounds.min,
    max: () => bounds.max,
    disabled: () => bounds.disabled ?? false,
    text: (v) => `${v} kg`,
  });
  return { model, ...stepper };
}

const key = (k: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', { key: k, cancelable: true, ...init });

describe('useStepper', () => {
  it('steps and announces button changes only', () => {
    const s = setup(60, { step: 2.5 });
    s.stepBy(1, true);
    expect(s.model.value).toBe(62.5);
    expect(s.announcement.value).toBe('62.5 kg');
    s.stepBy(-1, false);
    expect(s.model.value).toBe(60);
    expect(s.announcement.value).toBe('62.5 kg');
  });

  it('does not announce when the value does not change', () => {
    const s = setup(10, { max: 10 });
    s.stepBy(1, true);
    expect(s.model.value).toBe(10);
    expect(s.announcement.value).toBe('');
  });

  it('does nothing while disabled', () => {
    const s = setup(5, { disabled: true });
    s.stepBy(1, true);
    const event = key(Key.ArrowUp);
    s.onKeydown(event);
    expect(s.model.value).toBe(5);
    expect(event.defaultPrevented).toBe(false);
  });

  it('reports bound state', () => {
    expect(setup(0, { min: 0, max: 10 }).atMin.value).toBe(true);
    expect(setup(10, { min: 0, max: 10 }).atMax.value).toBe(true);
    const s = setup(5, { min: 0, max: 10 });
    expect([s.atMin.value, s.atMax.value]).toEqual([false, false]);
  });

  it.each([
    [Key.ArrowUp, 6],
    [Key.ArrowRight, 6],
    [Key.ArrowDown, 4],
    [Key.ArrowLeft, 4],
    [Key.Home, 0],
    [Key.End, 10],
  ])('%s moves to %s silently and is prevented', (k, expected) => {
    const s = setup(5, { min: 0, max: 10 });
    const event = key(k);
    s.onKeydown(event);
    expect(s.model.value).toBe(expected);
    expect(s.announcement.value).toBe('');
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores Home/End without a bound and unrelated keys', () => {
    const s = setup(5);
    for (const k of [Key.Home, Key.End, 'a']) {
      const event = key(k);
      s.onKeydown(event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(s.model.value).toBe(5);
  });

  it('leaves modified key presses to the browser', () => {
    const s = setup(5);
    for (const mod of ['altKey', 'ctrlKey', 'metaKey']) {
      const event = key(Key.ArrowUp, { [mod]: true });
      s.onKeydown(event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(s.model.value).toBe(5);
  });
});
