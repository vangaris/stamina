import { Key } from '@stamina/a11y';
import { expectNoA11yViolations } from '@stamina/ui-test';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import RestTimer from './RestTimer.vue';
import { installDialogPolyfill } from './dialog-polyfill.test-helper.ts';

beforeAll(installDialogPolyfill);
enableAutoUnmount(afterEach);

const announce = (seconds: number) => `${seconds} seconds left`;
const baseProps = {
  remainingSeconds: 90,
  totalSeconds: 90,
  label: 'Rest',
  skipLabel: 'Skip rest',
  announce,
};

function mountTimer(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(RestTimer, { attachTo: document.body, props: { ...baseProps, ...props }, slots });
}

const live = (w: ReturnType<typeof mountTimer>) => w.get('[role="status"]').text();

describe('RestTimer', () => {
  it('is an open modal dialog named by its visible title', () => {
    const w = mountTimer();
    const dialog = w.get('dialog');
    expect(dialog.attributes('open')).toBeDefined();
    const titleId = dialog.attributes('aria-labelledby');
    expect(w.get(`[id="${titleId}"]`).text()).toBe('Rest');
  });

  it('shows the remaining time as m:ss', async () => {
    const w = mountTimer({ remainingSeconds: 125 });
    expect(w.get('[data-testid="rest-timer-time"]').text()).toBe('2:05');
    await w.setProps({ remainingSeconds: 59 });
    expect(w.get('[data-testid="rest-timer-time"]').text()).toBe('0:59');
    await w.setProps({ remainingSeconds: 0 });
    expect(w.get('[data-testid="rest-timer-time"]').text()).toBe('0:00');
  });

  it('puts focus on Skip, and Skip emits skip', async () => {
    const w = mountTimer();
    const skip = w.get('button');
    expect(document.activeElement).toBe(skip.element);
    await skip.trigger('click');
    expect(w.emitted('skip')).toHaveLength(1);
  });

  it('emits skip once on Escape, without closing the dialog itself', async () => {
    const w = mountTimer();
    await w.get('dialog').trigger('keydown', { key: Key.Escape });
    expect(w.emitted('skip')).toHaveLength(1);
    expect(w.get('dialog').attributes('open')).toBeDefined();
  });

  it('emits skip when the dialog is cancelled without a keydown', async () => {
    const w = mountTimer();
    await w.get('dialog').trigger('cancel');
    expect(w.emitted('skip')).toHaveLength(1);
  });

  it('shows the add button only with addLabel, and emits add', async () => {
    expect(mountTimer().findAll('button')).toHaveLength(1);
    const w = mountTimer({ addLabel: '+15 s' });
    const add = w.findAll('button').find((b) => b.text() === '+15 s');
    expect(add).toBeDefined();
    await add!.trigger('click');
    expect(w.emitted('add')).toHaveLength(1);
    expect(w.emitted('skip')).toBeUndefined();
  });

  it('wraps Tab between the first and last button', async () => {
    const w = mountTimer({ addLabel: '+15 s' });
    const [add, skip] = w.findAll('button');
    (skip!.element as HTMLElement).focus();
    await w.get('dialog').trigger('keydown', { key: Key.Tab });
    expect(document.activeElement).toBe(add!.element);
    await w.get('dialog').trigger('keydown', { key: Key.Tab, shiftKey: true });
    expect(document.activeElement).toBe(skip!.element);
  });

  it('renders nextLabel, or the next slot instead', () => {
    expect(mountTimer({ nextLabel: 'Next: Bench press' }).text()).toContain('Next: Bench press');
    const w = mountTimer({ nextLabel: 'ignored' }, { next: 'Next: Row' });
    expect(w.text()).toContain('Next: Row');
    expect(w.text()).not.toContain('ignored');
    expect(mountTimer().text()).not.toContain('Next');
  });

  it('hides the decorative ring from assistive technology', () => {
    expect(mountTimer().get('svg').attributes('aria-hidden')).toBe('true');
  });

  describe('live region', () => {
    it('is a polite status region', () => {
      const region = mountTimer().get('[role="status"]');
      expect(region.attributes('aria-live')).toBe('polite');
    });

    it('announces at 10 s steps and each of the last five seconds, not every second', async () => {
      const w = mountTimer({ remainingSeconds: 32, totalSeconds: 90 });
      expect(live(w)).toBe('');
      const heard: string[] = [];
      for (let s = 31; s >= 0; s--) {
        await w.setProps({ remainingSeconds: s });
        const text = live(w);
        if (text && heard.at(-1) !== text) heard.push(text);
      }
      expect(heard).toEqual([30, 20, 10, 5, 4, 3, 2, 1, 0].map((s) => announce(s)));
    });

    it('announces time added off the 10 s grid', async () => {
      const w = mountTimer({ remainingSeconds: 40, totalSeconds: 90 });
      await w.setProps({ remainingSeconds: 55 });
      expect(live(w)).toBe('55 seconds left');
    });

    it('uses the caller supplied text', async () => {
      const w = mountTimer({
        remainingSeconds: 11,
        announce: (s: number) => `Απομένουν ${s} δευτερόλεπτα`,
      });
      await w.setProps({ remainingSeconds: 10 });
      expect(live(w)).toBe('Απομένουν 10 δευτερόλεπτα');
    });
  });

  it('closes the dialog and returns focus to the opener when removed', () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const w = mountTimer();
    const dialog = w.get('dialog').element;
    w.unmount();
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it.each([
    ['running', { remainingSeconds: 45 }],
    ['at the start, with add and next', { addLabel: '+15 s', nextLabel: 'Next: Row, set 2' }],
    ['over', { remainingSeconds: 0 }],
    ['extended beyond the total', { remainingSeconds: 120, totalSeconds: 90 }],
  ])('has no axe violations (%s)', async (_name, props) => {
    const w = mountTimer(props);
    await expectNoA11yViolations(w.element);
  });
});
