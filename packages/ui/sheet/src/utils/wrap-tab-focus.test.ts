import { Key } from '@stamina/a11y';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { wrapTabFocus } from './wrap-tab-focus.ts';

// jsdom has no layout: every element reports no client rects, so mark visible ones explicitly.
const visible = [{}] as unknown as DOMRectList;
const original = Element.prototype.getClientRects;

beforeEach(() => {
  Element.prototype.getClientRects = () => visible;
  document.body.innerHTML = `
    <dialog open>
      <button id="close"></button>
      <div id="scroller"><a href="#" id="link"></a><button id="hidden-btn" disabled></button></div>
      <div id="footer"><button id="save"></button></div>
    </dialog>`;
});
afterEach(() => {
  Element.prototype.getClientRects = original;
  document.body.innerHTML = '';
});

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const regions = () => ({
  dialog: document.querySelector('dialog'),
  closeButton: $('close'),
  scroller: $('scroller'),
  footer: $('footer'),
});

function tab(shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key: Key.Tab, shiftKey, cancelable: true });
  wrapTabFocus(event, regions());
  return event;
}

describe('wrapTabFocus', () => {
  it('wraps Tab from the last stop (footer) to the close button', () => {
    $('save').focus();
    const event = tab();
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe($('close'));
  });

  it('wraps Shift+Tab from the close button to the last stop', () => {
    $('close').focus();
    const event = tab(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe($('save'));
  });

  it('wraps Shift+Tab from the dialog itself to the last stop', () => {
    document.querySelector('dialog')!.setAttribute('tabindex', '-1');
    document.querySelector('dialog')!.focus();
    tab(true);
    expect(document.activeElement).toBe($('save'));
  });

  it('leaves Tab in the middle to the browser', () => {
    $('link').focus();
    expect(tab().defaultPrevented).toBe(false);
    expect(tab(true).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe($('link'));
  });

  it('skips disabled and invisible controls when finding the ends', () => {
    $('save').setAttribute('disabled', '');
    $('link').focus();
    expect(tab().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe($('close'));
  });

  it('treats a scrollable area with nothing focusable as a Tab stop', () => {
    $('scroller').innerHTML = '<p>text</p>';
    $('footer').remove();
    Object.defineProperty($('scroller'), 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty($('scroller'), 'clientHeight', { value: 100, configurable: true });
    $('scroller').tabIndex = -1; // focusable, but not matched by the tabbable selector
    $('scroller').focus();
    const event = new KeyboardEvent('keydown', { key: Key.Tab, cancelable: true });
    wrapTabFocus(event, { ...regions(), footer: null });
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe($('close'));
  });

  it('does nothing when there are no stops', () => {
    const event = new KeyboardEvent('keydown', { key: Key.Tab, cancelable: true });
    wrapTabFocus(event, { dialog: null, closeButton: null, scroller: null, footer: null });
    expect(event.defaultPrevented).toBe(false);
  });
});
