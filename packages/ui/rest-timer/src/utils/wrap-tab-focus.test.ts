import { afterEach, describe, expect, it } from 'vitest';
import { wrapTabFocus } from './wrap-tab-focus.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

function setup() {
  const add = document.createElement('button');
  const skip = document.createElement('button');
  document.body.append(add, skip);
  return { add, skip, stops: [add, skip] };
}

const tab = (shiftKey = false) =>
  new KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true });

describe('wrapTabFocus', () => {
  it('moves from the last control to the first on Tab', () => {
    const { add, skip, stops } = setup();
    skip.focus();
    const event = tab();
    wrapTabFocus(event, stops);
    expect(document.activeElement).toBe(add);
    expect(event.defaultPrevented).toBe(true);
  });

  it('moves from the first control to the last on Shift+Tab', () => {
    const { add, skip, stops } = setup();
    add.focus();
    const event = tab(true);
    wrapTabFocus(event, stops);
    expect(document.activeElement).toBe(skip);
    expect(event.defaultPrevented).toBe(true);
  });

  it('leaves Tab alone in the middle', () => {
    const { add, stops } = setup();
    add.focus();
    const event = tab();
    wrapTabFocus(event, stops);
    expect(document.activeElement).toBe(add);
    expect(event.defaultPrevented).toBe(false);
  });

  it('does nothing without controls', () => {
    const event = tab();
    wrapTabFocus(event, []);
    expect(event.defaultPrevented).toBe(false);
  });
});
